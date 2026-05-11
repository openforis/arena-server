import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import mammoth from 'mammoth'
import puppeteer from 'puppeteer'

import { ProcessEnv } from '../processEnv'

const pdfPageFormat = 'A4'
const pdfPageMargin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }

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

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

  try {
    const conversion = await mammoth.convertToHtml({ buffer: inputBuffer })
    const printableHtml = toPrintableHtml(conversion.value)

    browser = await launchBrowser()
    const page = await browser.newPage()
    await page.setContent(printableHtml, { waitUntil: 'load' })
    await page.pdf({
      path: resolvedOutputPath,
      format: pdfPageFormat,
      printBackground: true,
      margin: pdfPageMargin,
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
    if (browser) {
      await browser.close()
    }
  }
}

export const DocxConverter = {
  convertDocxToPdf,
}
