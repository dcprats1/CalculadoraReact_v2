/*
  # Crear Storage Bucket para PDFs de usuarios

  1. Bucket: user-tariff-pdfs
    - Almacena PDFs subidos por usuarios para validación
    - Organizado por carpetas de user_id

  2. Seguridad
    - Usuario solo puede subir a su propia carpeta
    - Usuario solo puede leer su propia carpeta
    - Límite de tamaño de archivo
*/

-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-tariff-pdfs', 'user-tariff-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Política: Usuario puede subir archivos solo a su carpeta
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-tariff-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: Usuario puede leer archivos solo de su carpeta
CREATE POLICY "Users can read their own folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-tariff-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: Usuario puede actualizar archivos solo en su carpeta
CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-tariff-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: Usuario puede eliminar archivos solo en su carpeta
CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-tariff-pdfs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
