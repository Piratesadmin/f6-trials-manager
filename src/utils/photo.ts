const maximumUploadBytes = 5 * 1024 * 1024
const maximumDimension = 360

export async function preparePlayerPhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file such as JPEG, PNG, HEIC or WebP.')
  if (file.size > maximumUploadBytes) throw new Error('The photo must be smaller than 5 MB.')

  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(sourceUrl)
    const scale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not prepare the photo.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This browser could not prepare the photo.')), 'image/jpeg', 0.76))
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The selected photo could not be opened.'))
    image.src = url
  })
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('The photo could not be read.'))
    reader.readAsDataURL(blob)
  })
}
