import { createHash, randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const validImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function uploadImageToStorage(file, folder) {
  if (!file || !validImageTypes.has(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.')
  if (file.size > 4 * 1024 * 1024) throw new Error('Each image must be 4 MB or smaller.')

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const fileExt = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const id = `${Date.now()}-${randomBytes(6).toString('hex')}`

  if (cloudName && apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000)
    const publicId = id
    const params = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`
    const signature = createHash('sha1').update(`${params}${apiSecret}`).digest('hex')
    const form = new FormData()
    form.append('file', file)
    form.append('api_key', apiKey)
    form.append('timestamp', String(timestamp))
    form.append('folder', folder)
    form.append('public_id', publicId)
    form.append('signature', signature)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: 'POST', body: form })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary could not save this image.')
    return { url: result.secure_url, publicId: result.public_id }
  }

  if (process.env.NODE_ENV === 'production') throw new Error('Cloudinary image storage is not configured.')
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '')
  const directory = path.join(process.cwd(), 'public', 'uploads', safeFolder)
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, `${id}.${fileExt}`), Buffer.from(await file.arrayBuffer()))
  return { url: `/uploads/${safeFolder}/${id}.${fileExt}`, publicId: null }
}
