import JSZip from 'jszip'

const settingsFilePath = 'word/settings.xml'
const settingsBlockCloseTag = '</w:settings>'
const documentProtectionTag = '<w:documentProtection w:edit="readOnly" w:enforcement="1"/>'

export const convertDocxToReadOnly = async (docBuffer: Buffer): Promise<Buffer> => {
  const zip = await JSZip.loadAsync(docBuffer)

  let settingsXml = await zip.file(settingsFilePath)?.async('string')

  if (!settingsXml) {
    throw new Error('settings.xml not found in the DOCX file')
  }

  if (settingsXml.includes(settingsBlockCloseTag)) {
    settingsXml = settingsXml.replace(settingsBlockCloseTag, `${documentProtectionTag}${settingsBlockCloseTag}`)
  } else {
    // Fallback if the file structure varies slightly
    settingsXml = settingsXml.replace('>', `>${documentProtectionTag}`)
  }

  zip.file(settingsFilePath, settingsXml)

  return zip.generateAsync({ type: 'nodebuffer' })
}
