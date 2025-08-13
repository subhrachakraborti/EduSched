
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSchedule } from '@/context/schedule-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { fetchBookDetailsAction, issueBookAction, fetchIssuedBooksAction } from '@/app/actions';
import { Book, BookCheck, Library, Loader2, Search, RefreshCcw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import type { IssuedBook } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface BookDetails {
    code: string;
    title: string;
    author: string;
    description: string;
    coverUrl: string;
}

interface IssuedBooksListRef {
  refresh: () => void;
}

const IssuedBooksList = React.forwardRef<IssuedBooksListRef>((props, ref) => {
    const { user } = useSchedule();
    const { toast } = useToast();
    const [issuedBooks, setIssuedBooks] = useState<IssuedBook[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadIssuedBooks = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const result = await fetchIssuedBooksAction(user.id);
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            setIssuedBooks(result.books || []);
        }
        setIsLoading(false);
    }, [user, toast]);

    useEffect(() => {
        loadIssuedBooks();
    }, [loadIssuedBooks]);
    
    React.useImperativeHandle(ref, () => ({
        refresh: loadIssuedBooks
    }));

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookCheck className="h-6 w-6" />
                        <CardTitle>My Issued Books</CardTitle>
                    </div>
                     <Button variant="ghost" size="icon" onClick={loadIssuedBooks} disabled={isLoading}>
                        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                </div>
                <CardDescription>Books you have currently checked out from the library.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                ) : issuedBooks.length > 0 ? (
                    <ul className="space-y-4">
                        {issuedBooks.map((book) => (
                            <li key={book.id} className="flex items-center gap-4 rounded-lg border p-4">
                                <Image 
                                    src={book.book_cover_url || 'https://placehold.co/80x120.png'} 
                                    alt={book.book_title || 'Book Cover'} 
                                    width={60} 
                                    height={90} 
                                    className="rounded-md object-cover"
                                    data-ai-hint="book cover" 
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">{book.book_title}</p>
                                    <p className="text-sm text-muted-foreground">{book.book_author}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Issued On: {new Date(book.issued_at).toLocaleDateString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        <p>You have not issued any books yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

IssuedBooksList.displayName = 'IssuedBooksList';


export default function LibraryPage() {
    const { user } = useSchedule();
    const { toast } = useToast();

    const [bookCode, setBookCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isIssuing, setIsIssuing] = useState(false);
    
    const [foundBook, setFoundBook] = useState<BookDetails | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const issuedBooksListRef = useRef<IssuedBooksListRef>(null);
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookCode) return;

        setIsLoading(true);
        const result = await fetchBookDetailsAction(bookCode);
        
        if (result.error) {
            toast({ variant: 'destructive', title: 'Search Failed', description: result.error });
            setFoundBook(null);
        } else if (result.book) {
            setFoundBook(result.book);
            setIsModalOpen(true);
        }
        setIsLoading(false);
    };

    const handleIssueBook = async () => {
        if (!foundBook || !user) return;

        setIsIssuing(true);
        const result = await issueBookAction(user.id, foundBook.code, foundBook.title, foundBook.author, foundBook.coverUrl);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Issue Failed', description: result.error });
        } else {
            toast({ title: 'Success!', description: `"${foundBook.title}" has been issued to your account.` });
            setIsModalOpen(false);
            setFoundBook(null);
            setBookCode('');
            issuedBooksListRef.current?.refresh();
        }
        setIsIssuing(false);
    };

    const closeDialog = () => {
        setIsModalOpen(false);
        setFoundBook(null);
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold md:text-3xl">Library</h1>
                <p className="text-muted-foreground">Search for a book by its code to issue it.</p>
            </div>

            <Card>
                <CardHeader>
                     <div className="flex items-center gap-2">
                        <Library className="h-6 w-6" />
                        <CardTitle>Book Search</CardTitle>
                    </div>
                    <CardDescription>Enter the book code to find and issue a book.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input 
                            placeholder="e.g., CS101-A" 
                            value={bookCode}
                            onChange={(e) => setBookCode(e.target.value)}
                        />
                        <Button type="submit" disabled={isLoading || !bookCode}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                            <span className="ml-2 hidden sm:inline">Search</span>
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            {user?.type === 'student' && <IssuedBooksList ref={issuedBooksListRef} />}

            {foundBook && (
                <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{foundBook.title}</AlertDialogTitle>
                            <AlertDialogDescription className="flex items-center gap-4 pt-4">
                               <Image 
                                    src={foundBook.coverUrl} 
                                    alt={foundBook.title} 
                                    width={100} 
                                    height={150} 
                                    className="rounded-md object-cover shadow-md"
                                    data-ai-hint="book cover" 
                                />
                               <div className="flex-1 space-y-2">
                                    <p className="text-sm"><strong>Author:</strong> {foundBook.author}</p>
                                    <p className="text-sm text-foreground">{foundBook.description}</p>
                               </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleIssueBook} disabled={isIssuing}>
                                {isIssuing && <Loader2 className="mr-2 animate-spin" />}
                                Issue Book
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
