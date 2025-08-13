
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Video, VideoOff, Download, Save, Loader2, UserCheck, Trash2 } from "lucide-react";
import { useSchedule } from "@/context/schedule-context";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import jsQR from "jsqr";
import { batchRecordAttendanceAction, fetchStudentNamesAction } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import jsPDF from "jspdf";
import 'jspdf-autotable';
import type { User } from "@/lib/types";


type SessionScan = {
  studentId: string;
  studentName: string; 
};

export default function QrPage() {
  const { user } = useSchedule();
  const { toast } = useToast();
  
  const [selectedSubject, setSelectedSubject] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [sessionScans, setSessionScans] = useState<SessionScan[]>([]);
  const scannedCodesThisSession = useRef(new Set<string>());
  
  const [sessionSubject, setSessionSubject] = useState('');
  
  const handleGenerateStudentQr = () => {
    if (user?.type === 'student' && selectedSubject) {
      const today = new Date();
      const dateString = format(today, 'ddMMyy');
      const dataToEncode = `${user.id}.${dateString}.${selectedSubject}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`);
    } else {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please select a subject to generate your QR code.",
        });
    }
  };

  const startScan = async () => {
    if (!sessionSubject) {
        toast({
            variant: 'destructive',
            title: 'No Subject Selected',
            description: 'Please select a subject for this attendance session.',
        });
        return;
    }
    setIsScanning(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsScanning(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  };

  const stopScan = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  const resetSession = () => {
    stopScan();
    setSessionScans([]);
    scannedCodesThisSession.current.clear();
  };

  const handleSaveAttendance = async () => {
      if (sessionScans.length === 0) {
          toast({ title: "No new attendance records to save."});
          return;
      }
      setIsSaving(true);
      const studentIds = sessionScans.map(scan => scan.studentId);
      const result = await batchRecordAttendanceAction(studentIds, sessionSubject, user!.id);

      if (result.error) {
          toast({ variant: 'destructive', title: 'Save Failed', description: result.error});
      }
      if (result.success) {
          toast({ title: 'Success!', description: `${result.count} new attendance records saved.`});
          // Clear the list after saving, but keep scanned codes to prevent re-adding during the same session
          setSessionScans([]);
      }
      setIsSaving(false);
  }

  const downloadAttendancePdf = async () => {
    if (sessionScans.length === 0) {
        toast({ title: "No attendance to download."});
        return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Attendance Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Session Date: ${format(new Date(), 'yyyy-MM-dd')}`, 14, 30);
    doc.text(`Subject: ${sessionSubject}`, 14, 36);
    
    const tableData = sessionScans.map(scan => [scan.studentName, format(new Date(), 'yyyy-MM-dd'), sessionSubject]);
    
    (doc as any).autoTable({
        startY: 42,
        head: [['Student Name', 'Date', 'Subject']],
        body: tableData,
    });

    doc.save(`attendance-${sessionSubject}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const processQrCode = useCallback(async (qrData: string) => {
    // 1. Check if we've already processed this exact QR code string in this session
    if (scannedCodesThisSession.current.has(qrData)) {
      return;
    }
    scannedCodesThisSession.current.add(qrData);

    // 2. Validate the format
    const match = qrData.match(/^([^.]+)\.(\d{6})\.(.+)$/);
    if (!match) {
      toast({ variant: 'destructive', title: 'Invalid QR Format' });
      return;
    }

    const [, studentId, , subjectFromQR] = match;

    // 3. Check if subject matches the current session
    if (subjectFromQR !== sessionSubject) {
      toast({
        variant: 'destructive',
        title: 'Subject Mismatch',
        description: `This QR code is for ${subjectFromQR}, but the session is for ${sessionSubject}.`,
      });
      return;
    }

    // 4. Check if student is already in the list for this session
    if (sessionScans.some(s => s.studentId === studentId)) {
        // You might want to give a toast feedback here, or just ignore it silently
        return;
    }

    // 5. Fetch student name and add to the list
    const { data, error } = await fetchStudentNamesAction([studentId]);
    if (error || !data || data.length === 0) {
        toast({ variant: 'destructive', title: 'Student Not Found', description: `Could not find a user for ID: ${studentId}` });
        return;
    }
    
    const studentName = data[0].name;
    setSessionScans(prev => [...prev, { studentId, studentName }]);
    toast({
        title: 'Student Scanned',
        description: `Added ${studentName} to the session.`
    });

  }, [sessionSubject, toast, sessionScans]);


  // Main scanning loop
  useEffect(() => {
    if (!isScanning || !hasCameraPermission) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    let animationFrameId: number;

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
           processQrCode(code.data);
        }
      }
      if (isScanning) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isScanning, hasCameraPermission, processQrCode]);


  const renderScanner = () => {
    if (user?.type === 'admin' || user?.type === 'teacher') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Scanner</CardTitle>
            <CardDescription>Select a subject, then scan student QR codes. Save the session when done.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
             <div className="w-full space-y-2">
                <Label htmlFor="session-subject">Session Subject</Label>
                 <Select onValueChange={setSessionSubject} value={sessionSubject} disabled={isScanning}>
                    <SelectTrigger id="session-subject">
                        <SelectValue placeholder="Select subject for this session" />
                    </SelectTrigger>
                    <SelectContent>
                        {user?.subjects && user.subjects.length > 0 ? (
                            user.subjects.map(subjectCode => (
                                <SelectItem key={subjectCode} value={subjectCode}>{subjectCode}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>No subjects assigned</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="relative h-64 w-full overflow-hidden rounded-lg border-2 border-dashed bg-card-foreground/5">
              {isScanning ? (
                <>
                  <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                  <div className="scanline" />
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                   <QrCode className="h-16 w-16" />
                   <p className="text-center text-sm">Camera is off</p>
                </div>
              )}
            </div>
            
            <div className="flex w-full items-center justify-center gap-2">
                {!isScanning ? (
                    <Button onClick={startScan} className="flex-1 bg-accent hover:bg-accent/90" disabled={!sessionSubject}>
                        <Video className="mr-2 h-4 w-4" /> Start Camera
                    </Button>
                ) : (
                    <Button onClick={stopScan} variant="destructive" className="flex-1">
                        <VideoOff className="mr-2 h-4 w-4" /> Stop Camera
                    </Button>
                )}
                 <Button onClick={resetSession} variant="outline" size="icon" title="Reset Session">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            
             {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                    Please allow camera access in your browser settings to use this feature.
                    </AlertDescription>
                </Alert>
            )}

            {sessionScans.length > 0 && (
              <div className="w-full space-y-4">
                <div className="flex w-full items-center justify-between">
                    <h4 className="font-semibold">Scanned this session ({sessionScans.length}):</h4>
                    <div className="flex gap-2">
                         <Button onClick={handleSaveAttendance} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save
                        </Button>
                        <Button onClick={downloadAttendancePdf} variant="outline">
                            <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                    </div>
                </div>
                <ul className="max-h-40 w-full overflow-y-auto rounded-md border p-2 text-sm">
                  {sessionScans.map((scan, i) => (
                      <li key={`${scan.studentId}-${i}`} className="flex items-center justify-between p-1">
                        <span className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-green-500" />
                            {scan.studentName}
                        </span>
                      </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const renderQrGenerator = () => {
    if (user?.type === 'student') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generator</CardTitle>
            <CardDescription>Select your subject to generate a daily QR code for attendance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select onValueChange={setSelectedSubject} value={selectedSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {(user?.subjects && user.subjects.length > 0) ? (
                    user.subjects.map(subjectCode => (
                      <SelectItem key={subjectCode} value={subjectCode}>{subjectCode}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No subjects assigned</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateStudentQr} disabled={!selectedSubject || !user?.subjects || user.subjects.length === 0} className="w-full bg-accent hover:bg-accent/90">Generate QR Code</Button>
            {qrCodeUrl && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card-foreground/5 p-4">
                <Image src={qrCodeUrl} alt="Generated QR Code" width={200} height={200} className="rounded-md" />
                <p className="text-center text-sm text-muted-foreground">Show this code to your teacher to mark attendance.</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    if (user?.type === 'teacher') {
      return (
         <Card>
            <CardHeader>
              <CardTitle>Your Subjects</CardTitle>
              <CardDescription>These are the subjects you are assigned to teach. Select one for the attendance session.</CardDescription>
            </CardHeader>
            <CardContent>
                {user.subjects && user.subjects.length > 0 ? (
                    <ul className="space-y-2">
                        {user.subjects.map(s => <li key={s} className="rounded-md border p-2 text-sm font-medium">{s}</li>)}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">You are not assigned to any subjects.</p>
                )}
            </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">QR Tools</h1>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          {renderScanner()}
        </div>
        <div className="flex flex-col gap-6">
          {renderQrGenerator()}
        </div>
      </div>
    </div>
  );
}
