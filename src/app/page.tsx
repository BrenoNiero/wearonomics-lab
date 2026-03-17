
'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud } from 'lucide-react';
import { addUpload } from '@/lib/library';

const SUPPORTED_FILE_TYPES = ['text/csv', 'application/gpx+xml', 'application/vnd.garmin.tcx+xml', '.csv', '.gpx', '.tcx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError('File size must be less than 5MB.');
        setFile(null);
        return;
      }
      
      const fileTypeSupported = SUPPORTED_FILE_TYPES.some(type => 
        selectedFile.type === type || selectedFile.name.toLowerCase().endsWith(type)
      );
      if (!fileTypeSupported) {
        setError('Invalid file type. Please upload a CSV, GPX, or TCX file.');
        setFile(null);
        return;
      }

      setError(null);
      setFile(selectedFile);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const newUpload = await addUpload(file);
      
      toast({
        title: 'Analysis Complete',
        description: 'Movement evidence has been validated.',
      });

      setFile(null);
      router.push(`/report?id=${newUpload.id}`);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Could not process the file.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="space-y-8 py-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Wearonomics Lab
        </h1>
        <p className="text-sm text-foreground">
          Human movement validation active. Upload datasets for kinetic analysis.
        </p>
      </div>

      <div className="grid gap-8">
        <Card className="border-border bg-background shadow-none">
          <CardContent className="space-y-6 pt-6">
            <div 
              onClick={triggerFileSelect}
              onDrop={(e) => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } } as any); }}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg cursor-pointer border-border hover:bg-muted transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-4 text-foreground" />
                <p className="mb-2 text-sm text-foreground">
                  <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-foreground">CSV, TCX, or GPX (max. 5MB)</p>
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".csv,.gpx,.tcx,text/csv,application/gpx+xml,application/vnd.garmin.tcx+xml"
                ref={fileInputRef}
              />
            </div>

            {error && (
              <div className="mt-4 text-sm text-destructive font-medium">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted border-t border-border py-6 flex flex-col gap-6">
            {file && (
              <div className="flex items-center justify-between w-full text-[10px] uppercase tracking-[0.2em] font-medium animate-in fade-in slide-in-from-bottom-1 duration-300 text-foreground">
                <span className="">
                  {isProcessing ? 'Preparing' : 'Selected file'}
                </span>
                <span 
                  className="truncate max-w-[300px] text-right" 
                  title={file.name}
                >
                  {file.name}
                </span>
              </div>
            )}
            <Button 
              onClick={handleUpload} 
              disabled={!file || isProcessing} 
              className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground"
            >
              {isProcessing ? 'Analysing Movement Evidence...' : 'Upload and Analyse'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
