import { v2 as cloudinary } from 'cloudinary'

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  format: string
  resource_type: string
  bytes: number
  width?: number
  height?: number
}

/**
 * Upload de arquivo para Cloudinary
 * @param base64Data - String base64 do arquivo (com ou sem prefix data:image/...)
 * @param folder - Pasta no Cloudinary (ex: 'patient-documents/clinic-123')
 * @param resourceType - Tipo de recurso ('image', 'raw', 'video', 'auto')
 * @returns Promise com informações do arquivo enviado
 */
export async function uploadToCloudinary(
  base64Data: string,
  folder: string,
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'
): Promise<CloudinaryUploadResult> {
  try {
    // Garantir que tem o prefix data:
    const base64WithPrefix = base64Data.startsWith('data:')
      ? base64Data
      : `data:application/octet-stream;base64,${base64Data}`

    const result = await cloudinary.uploader.upload(base64WithPrefix, {
      folder,
      resource_type: resourceType,
      // Gerar um ID único
      use_filename: false,
      unique_filename: true,
      // Garantir acesso público
      type: 'upload',
      access_mode: 'public',
    })

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    }
  } catch (error: any) {
    console.error('Cloudinary upload error:', error)
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`)
  }
}

/**
 * Deletar arquivo do Cloudinary
 * @param publicId - ID público do arquivo no Cloudinary
 * @param resourceType - Tipo de recurso ('image', 'raw', 'video')
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'raw'
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (error: any) {
    console.error('Cloudinary delete error:', error)
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`)
  }
}

/**
 * Obter URL segura de um arquivo
 * @param publicId - ID público do arquivo
 * @param resourceType - Tipo de recurso
 */
export function getCloudinaryUrl(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'raw'
): string {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
  })
}

export default cloudinary
