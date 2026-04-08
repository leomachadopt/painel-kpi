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

    // Detectar PDFs e forçar como 'raw' (Cloudinary classifica PDFs como 'image' erroneamente)
    let finalResourceType = resourceType
    if (resourceType === 'auto' && base64WithPrefix.includes('application/pdf')) {
      finalResourceType = 'raw'
      console.log('Detected PDF, forcing resource_type: raw')
    }

    const result = await cloudinary.uploader.upload(base64WithPrefix, {
      folder,
      resource_type: finalResourceType,
      // Gerar um ID único
      use_filename: false,
      unique_filename: true,
      // Upload público com access_mode explícito
      type: 'upload',
      access_mode: 'public',
      // Garantir que não há restrições
      moderation: undefined,
      access_control: undefined,
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
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: 'upload',
      invalidate: true
    })
  } catch (error: any) {
    console.error('Cloudinary delete error:', error)
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`)
  }
}

/**
 * Obter URL segura e assinada de um arquivo (com expiração)
 * Para arquivos authenticated do Cloudinary
 * @param publicId - ID público do arquivo
 * @param resourceType - Tipo de recurso
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
 */
export function getCloudinarySignedUrl(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'raw',
  expiresIn: number = 3600 // 1 hora (não usado para arquivos públicos)
): string {
  // Para arquivos públicos, apenas retornar a URL segura
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
    type: 'upload',
  })
}

/**
 * Obter URL segura de um arquivo (sem assinatura - só funciona se arquivo for público)
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

/**
 * Baixar arquivo do Cloudinary
 * Suporta arquivos públicos (usando URL direta) e privados (usando private_download_url)
 * @param publicId - ID público do arquivo
 * @param resourceType - Tipo de recurso
 * @param secureUrl - URL segura do Cloudinary (se disponível, usada como método primário)
 * @returns Buffer do arquivo
 */
export async function downloadFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'raw',
  secureUrl?: string
): Promise<Buffer> {
  try {
    // Método 1: Usar a secure_url direta (mais confiável para arquivos públicos)
    if (secureUrl) {
      console.log('Downloading from Cloudinary secure URL:', publicId)
      const response = await fetch(secureUrl)

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
      }
      console.warn('Secure URL download failed:', response.status, response.statusText)
    }

    // Método 2: Construir URL pública usando o SDK
    const publicUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
      type: 'upload'
    })

    console.log('Downloading from Cloudinary public URL:', publicUrl)
    const publicResponse = await fetch(publicUrl)

    if (publicResponse.ok) {
      const arrayBuffer = await publicResponse.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }
    console.warn('Public URL download failed:', publicResponse.status, publicResponse.statusText)

    // Método 3: Tentar private_download_url como último recurso
    // Extrair formato do public_id ou usar formato genérico
    const format = publicId.includes('.') ? publicId.split('.').pop()! : ''
    const privateUrl = cloudinary.utils.private_download_url(publicId, format || 'raw', {
      resource_type: resourceType,
      attachment: false,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    })

    console.log('Trying private download URL as fallback:', publicId)
    const privateResponse = await fetch(privateUrl)

    if (!privateResponse.ok) {
      throw new Error(`All download methods failed for ${publicId}. Last status: ${privateResponse.status} ${privateResponse.statusText}`)
    }

    const arrayBuffer = await privateResponse.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error: any) {
    console.error('Cloudinary download error:', error)
    throw new Error(`Failed to download from Cloudinary: ${error.message}`)
  }
}

export default cloudinary
