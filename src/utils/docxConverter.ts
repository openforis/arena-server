import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import mammoth from 'mammoth'
import puppeteer from 'puppeteer'

import { ProcessEnv } from '../processEnv'

const pdfPageFormat = 'A4'
const pdfPageMargin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
const pageLoadTimeoutMs = 15000
const parsedMaxConcurrency = Number(process.env.DOCX_PDF_MAX_CONCURRENCY ?? 2)
const maxPdfConversionsInParallel =
  Number.isFinite(parsedMaxConcurrency) && parsedMaxConcurrency > 0 ? Math.floor(parsedMaxConcurrency) : 2

let runningPdfConversions = 0
const pendingPdfConversions: Array<() => void> = []
let sharedBrowser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
let sharedBrowserPromise: Promise<Awaited<ReturnType<typeof puppeteer.launch>>> | null = null

const acquireConversionSlot = async (): Promise<() => void> =>
  new Promise((resolve) => {
    const grantSlot = () => {
      runningPdfConversions += 1
      resolve(() => {
        runningPdfConversions -= 1
        const next = pendingPdfConversions.shift()
        if (next) {
          next()
        }
      })
    }

    if (runningPdfConversions < maxPdfConversionsInParallel) {
      grantSlot()
    } else {
      pendingPdfConversions.push(grantSlot)
    }
  })

const isAllowedRequestUrl = (url: string): boolean =>
  url.startsWith('data:') || url === 'about:blank' || url.startsWith('blob:')

const isSandboxLaunchError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('No usable sandbox') || message.includes('zygote_host_impl_linux')
}

const launchBrowser = async (): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> => {
  const forceNoSandbox = process.env.PUPPETEER_NO_SANDBOX === 'true'

  if (forceNoSandbox) {
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  try {
    return await puppeteer.launch({ headless: true })
  } catch (error: unknown) {
    if (!isSandboxLaunchError(error)) {
      throw error
    }

    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
}

const getSharedBrowser = async (): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> => {
  if (sharedBrowser) {
    return sharedBrowser
  }

  if (sharedBrowserPromise) {
    return sharedBrowserPromise
  }

  sharedBrowserPromise = launchBrowser()
    .then((browser) => {
      sharedBrowser = browser
      sharedBrowserPromise = null
      browser.on('disconnected', () => {
        sharedBrowser = null
      })
      return browser
    })
    .catch((error) => {
      sharedBrowserPromise = null
      throw error
    })

  return sharedBrowserPromise
}

const toPrintableHtml = (bodyHtml: string): string => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { size: A4; margin: 20mm; }
      html, body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; line-height: 1.4; }
      img { max-width: 100%; height: auto; }
      table { border-collapse: collapse; width: 100%; }
      th, td { vertical-align: top; }
      p { margin: 0 0 8pt 0; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`

/**
 * Converts a DOCX file (provided as a Buffer) to PDF.
 * @param inputBuffer - The DOCX file as a Buffer.
 * @param outputPath - The path where the PDF file will be saved. If not provided, it will use a temporary directory.
 * @returns The path to the generated PDF file.
 */
const convertDocxToPdf = async (inputBuffer: Buffer, outputPath?: string): Promise<string> => {
  const tempDir = ProcessEnv.tempFolder
  const id = randomUUID()
  fs.mkdirSync(tempDir, { recursive: true })
  const resolvedOutputPath = outputPath || path.join(tempDir, `temp-${id}.pdf`)
  const outputDir = path.dirname(resolvedOutputPath)
  fs.mkdirSync(outputDir, { recursive: true })

  const releaseConversionSlot = await acquireConversionSlot()
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>['newPage']>> | null = null

  try {
    const conversion = await mammoth.convertToHtml({ buffer: inputBuffer })
    const printableHtml = toPrintableHtml(conversion.value)

    const browser = await getSharedBrowser()
    page = await browser.newPage()
    // Hardening: abort non-local requests to avoid SSRF/network egress and flaky remote fetches.
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      if (isAllowedRequestUrl(request.url())) {
        request.continue().catch(() => undefined)
      } else {
        request.abort().catch(() => undefined)
      }
    })

    page.setDefaultNavigationTimeout(pageLoadTimeoutMs)
    page.setDefaultTimeout(pageLoadTimeoutMs)
    await page.setContent(printableHtml, { waitUntil: 'domcontentloaded', timeout: pageLoadTimeoutMs })
    await page.pdf({
      path: resolvedOutputPath,
      format: pdfPageFormat,
      printBackground: true,
      margin: pdfPageMargin,
      timeout: pageLoadTimeoutMs,
    })

    return resolvedOutputPath
  } catch (error: unknown) {
    const fallbackHint =
      isSandboxLaunchError(error) || process.env.PUPPETEER_NO_SANDBOX === 'true'
        ? ' Chromium sandbox issue detected. You can set PUPPETEER_NO_SANDBOX=true (less secure) or configure a usable sandbox in the host OS.'
        : ''

    throw new Error(
      `Failed to convert DOCX to PDF: ${error instanceof Error ? error.message : String(error)}${fallbackHint}`,
      {
        cause: error,
      }
    )
  } finally {
    if (page) {
      await page.close().catch(() => undefined)
    }
    releaseConversionSlot()
  }
}

export const DocxConverter = {
  convertDocxToPdf,
}
