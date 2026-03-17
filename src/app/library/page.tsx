
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getLibrary,
  deleteUpload,
  clearLibrary,
  type Upload,
} from '@/lib/library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function LibraryPage() {
  const [library, setLibrary] = useState<Upload[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setLibrary(getLibrary());
    setIsClient(true);
  }, []);

  const handleRowClick = (id: string) => {
    router.push(`/report?id=${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUpload(id);
      setLibrary(getLibrary());
      toast({
        title: 'Dataset Deleted',
        description: 'The dataset has been removed and the ledger updated.',
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the dataset.',
      });
    }
  };

  const handleClearAll = async () => {
    await clearLibrary();
    setLibrary([]);
    toast({
      title: 'All Data Cleared',
      description: 'Your Data Library and ledger have been reset.',
    });
  };

  const filteredLibrary = library.filter((upload) => {
    const term = searchTerm.toLowerCase();
    return (
      upload.datasetName.toLowerCase().includes(term) ||
      upload.fileName.toLowerCase().includes(term)
    );
  });
  
  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Data Library
      </h1>
      <div className="space-y-4 text-muted-foreground">
        <p>
          The Data Library collects every dataset analysed in this demo. Select an entry
          to open its report.
        </p>
      </div>

      <Input
        placeholder="Search by dataset name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Dataset Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLibrary.length > 0 ? (
              filteredLibrary.map((upload) => (
                <TableRow
                  key={upload.id}
                  onClick={() => handleRowClick(upload.id)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    {new Date(upload.uploadedAt || (upload as any).uploadTimestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">{upload.datasetName}</TableCell>
                  <TableCell>
                    {upload.fileSizeBytes 
                      ? `${(upload.fileSizeBytes / 1024).toFixed(1)} KB` 
                      : '—'}
                  </TableCell>
                  <TableCell>{upload.status}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the dataset and recompute the ledger. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(upload.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No datasets found. <Link href="/" className="text-primary underline">Upload one</Link> to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {library.length > 0 && (
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="outline">Clear all data</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to clear all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all uploaded datasets and ledger entries. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
      )}

    </div>
  );
}
