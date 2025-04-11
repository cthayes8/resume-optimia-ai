import { supabase } from '@/lib/supabase';
import type { Json } from '@/integrations/supabase/types';

export interface Resume {
  id: string;
  user_id: string | null;
  file_path: string | null;
  data: Json;
  created_at: string | null;
  format_issues: Json | null;
  name?: string;
  updated_at?: string;
}

export async function uploadResume(file: File, userId: string, name: string) {
  try {
    // Validate file size
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    // Validate file type
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['pdf', 'docx', 'txt'];
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      throw new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.');
    }

    // Upload file to Supabase Storage
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    console.log('Attempting to upload file:', {
      fileName,
      fileSize: file.size,
      fileType: file.type
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resume-files')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error details:', {
        error: uploadError,
        message: uploadError.message,
        name: uploadError.name
      });
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    if (!uploadData?.path) {
      throw new Error('Upload succeeded but no path returned');
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('resume-files')
      .getPublicUrl(uploadData.path);

    console.log('File uploaded successfully:', {
      path: uploadData.path,
      publicUrl
    });

    // Create a record in the resumes table
    const { data: resume, error: dbError } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        file_path: publicUrl,
        name: name,
        data: {
          original_filename: file.name,
          type: fileExt,
          url: publicUrl,
          size: file.size,
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', {
        error: dbError,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      // If database insert fails, try to clean up the uploaded file
      await supabase.storage
        .from('resume-files')
        .remove([uploadData.path]);
      throw new Error(`Failed to save resume: ${dbError.message}`);
    }

    return resume;
  } catch (error) {
    console.error('Error uploading resume:', error);
    throw error;
  }
}

export async function getUserResumes(userId: string) {
  try {
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching resumes:', error);
    throw error;
  }
}

export async function deleteResume(id: string, userId: string) {
  try {
    // Get the resume to find the file path
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete the file from storage if file_path exists
    if (resume?.file_path) {
      const fileName = resume.file_path.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('Resume Files')
          .remove([`${userId}/${fileName}`]);

        if (storageError) throw storageError;
      }
    }

    // Delete the record from the database
    const { error: dbError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) throw dbError;
  } catch (error) {
    console.error('Error deleting resume:', error);
    throw error;
  }
}

export async function updateResumeName(id: string, name: string, userId: string) {
  try {
    // First get the current data
    const { data: current, error: fetchError } = await supabase
      .from('resumes')
      .select('data')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Update the name in the data object
    const updatedData = {
      ...current.data as Record<string, unknown>,
      name
    };

    // Update the record with the new data
    const { data, error } = await supabase
      .from('resumes')
      .update({
        data: updatedData
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating resume name:', error);
    throw error;
  }
} 