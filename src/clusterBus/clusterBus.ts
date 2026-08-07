import { DB } from '../db'
import { Logger } from '../log'
import { WsRelayMessageRepository } from '../repository'
import { runWithClusterLock } from './clusterLock'
import { ClusterEvent, ClusterEventHandler } from './types'

type ListenConnection = Awaited<ReturnType<typeof DB.connect>>

// Postgres caps NOTIFY payloads at 8000 bytes; stay safely under that before spilling to the DB.
const NOTIFY_PAYLOAD_SAFE_THRESHOLD_BYTES = 7000

const CHANNEL = 'arena_cluster_event'

// Spilled-over payloads are only ever read moments after insert, by the NOTIFY that points at
// them - a generous TTL here just bounds ws_relay_message's size if a dyno never claims one.
const RELAY_MESSAGE_TTL_MS = 10 * 60_000
const RELAY_MESSAGE_SWEEP_INTERVAL_MS = 5 * 60_000
const RELAY_MESSAGE_SWEEP_LOCK_NAME = 'ws-relay-message-ttl-sweep'

type InlineEnvelope = { inline: true; event: ClusterEvent }
type RelayedEnvelope = { inline: false; relayMessageId: string }
type Envelope = InlineEnvelope | RelayedEnvelope

/**
 * Postgres-backed cluster bus: a single LISTEN/NOTIFY channel shared by every dyno.
 * `publish` never throws - delivery is best-effort, matching the pre-existing
 * "check before emitting, self-heal otherwise" behavior of WebSocketServer.
 */
export class ClusterBus {
  private static readonly logger: Logger = new Logger('ClusterBus')
  private static listenConnection: ListenConnection | null = null
  private static handlers: ClusterEventHandler[] = []
  private static sweepInterval: NodeJS.Timeout | null = null

  static async init(): Promise<void> {
    if (ClusterBus.listenConnection) return

    const connection = await DB.connect({ direct: true })
    ClusterBus.listenConnection = connection

    connection.client.on('notification', (msg: { payload?: string }) => {
      ClusterBus.onNotification(msg).catch((error) => ClusterBus.logger.error(`error handling notification: ${error}`))
    })

    await connection.none(`LISTEN ${CHANNEL}`)
    ClusterBus.logger.info(`listening on channel "${CHANNEL}"`)

    ClusterBus.sweepInterval = setInterval(() => {
      runWithClusterLock({
        lockName: RELAY_MESSAGE_SWEEP_LOCK_NAME,
        fn: async () => {
          await WsRelayMessageRepository.deleteExpired(RELAY_MESSAGE_TTL_MS)
        },
      }).catch((error) => ClusterBus.logger.error(`error running ws_relay_message TTL sweep: ${error}`))
    }, RELAY_MESSAGE_SWEEP_INTERVAL_MS)
    ClusterBus.sweepInterval.unref()
  }

  static async shutdown(): Promise<void> {
    if (ClusterBus.sweepInterval) clearInterval(ClusterBus.sweepInterval)
    ClusterBus.sweepInterval = null

    const connection = ClusterBus.listenConnection
    if (!connection) return

    ClusterBus.listenConnection = null
    try {
      await connection.none(`UNLISTEN ${CHANNEL}`)
    } catch (error) {
      ClusterBus.logger.error(`error unlistening: ${error}`)
    } finally {
      await connection.done()
    }
  }

  /**
   * Registers a handler invoked for every cluster event received, including this dyno's own
   * publications (Postgres delivers NOTIFY to every session listening on the channel).
   * Handlers are expected to no-op when the event doesn't target something they own locally.
   */
  static onEvent(handler: ClusterEventHandler): void {
    ClusterBus.handlers.push(handler)
  }

  static async publish(event: ClusterEvent): Promise<void> {
    try {
      const serializedEvent = JSON.stringify(event)

      const envelope: Envelope =
        Buffer.byteLength(serializedEvent, 'utf8') <= NOTIFY_PAYLOAD_SAFE_THRESHOLD_BYTES
          ? { inline: true, event }
          : { inline: false, relayMessageId: await WsRelayMessageRepository.insert(event) }

      await DB.query('SELECT pg_notify($1, $2)', [CHANNEL, JSON.stringify(envelope)])
    } catch (error) {
      ClusterBus.logger.error(`error publishing event: ${error}`)
    }
  }

  private static async onNotification(msg: { payload?: string }): Promise<void> {
    if (!msg.payload) return

    const envelope: Envelope = JSON.parse(msg.payload)
    const event = envelope.inline ? envelope.event : await WsRelayMessageRepository.getById(envelope.relayMessageId)
    if (!event) return

    ClusterBus.handlers.forEach((handler) => handler(event as ClusterEvent))
  }
}
