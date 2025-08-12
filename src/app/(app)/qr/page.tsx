
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, ScanLine, Video, VideoOff } from "lucide-react";
import { useSchedule } from "@/context/schedule-context";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import jsQR from "jsqr";
import { recordAttendanceAction } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import subjects from "@/lib/subjects.json";
import { cn } from "@/lib/utils";

type Subject = {
  code: string;
  name: string;
};

type ScannedResult = {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function QrPage() {
  const { user } = useSchedule();
  const { toast } = useToast();
  
  const [selectedSubject, setSelectedSubject] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [userSubjects, setUserSubjects] = useState<Subject[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResults, setScannedResults] = useState<ScannedResult[]>([]);
  const scannedCodesThisSession = useRef(new Set<string>());
  
  useEffect(() => {
    if (user?.type === 'student' && user.group) {
      const studentGroup = user.group as keyof typeof subjects;
      setUserSubjects(subjects[studentGroup] || []);
    } else if (user?.type === 'teacher') {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(user.id)}`);
    }
  }, [user]);

  const handleGenerateStudentQr = () => {
    if (user?.type === 'student' && selectedSubject) {
      const today = new Date().toISOString().slice(0, 10);
      const dataToEncode = `${user.id}-${today}-${selectedSubject}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`);
    } else {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please select a subject to generate your QR code.",
        })
    }
  };

  const startScan = async () => {
    scannedCodesThisSession.current.clear();
    setScannedResults([]);
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

  const handleScan = async (data: string) => {
    if (scannedCodesThisSession.current.has(data)) {
        return; // Already scanned this session
    }
    scannedCodesThisSession.current.add(data);

    const parts = data.split('-');
    // Expecting studentId, YYYY, MM, DD, subjectCode -> 5 parts
    if (parts.length < 5) {
      setScannedResults(prev => [...prev, { type: 'info', message: `Scanned non-student QR: ${data}` }]);
      return;
    }
    
    const studentId = parts[0];
    const date = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const subject = parts.slice(4).join('-'); // handles subject codes with hyphens
    const reconstructedData = `${studentId}-${date}-${subject}`;

    const result = await recordAttendanceAction(reconstructedData);

    if (result.error) {
      setScannedResults(prev => [...prev, { type: 'error', message: result.error! }]);
      toast({
          variant: "destructive",
          title: "Attendance Error",
          description: result.error,
      });
    } else {
      setScannedResults(prev => [...prev, { type: 'success', message: result.message! }]);
      toast({
          title: "Attendance Recorded!",
          description: result.message,
      });
    }
  }

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
          handleScan(code.data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, hasCameraPermission]);


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
                  {userSubjects.map(sub => (
                    <SelectItem key={sub.code} value={sub.code}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateStudentQr} disabled={!selectedSubject} className="w-full bg-accent hover:bg-accent/90">Generate QR Code</Button>
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
            <CardTitle>Your Static QR Code</CardTitle>
            <CardDescription>This is your static identification QR code.</CardDescription>
          </CardHeader>
          <CardContent>
            {qrCodeUrl && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card-foreground/5 p-4">
                <Image src={qrCodeUrl} alt="Teacher QR Code" width={200} height={200} className="rounded-md" />
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const renderScanner = () => {
    if (user?.type === 'admin' || user?.type === 'teacher') {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Scanner</CardTitle>
            <CardDescription>Scan a student's QR code to mark attendance. The camera will scan continuously.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
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
            
            {!isScanning ? (
                <Button onClick={startScan} className="bg-accent hover:bg-accent/90">
                    <Video className="mr-2 h-4 w-4" /> Start Camera
                </Button>
            ) : (
                <Button onClick={stopScan} variant="destructive">
                    <VideoOff className="mr-2 h-4 w-4" /> Stop Camera
                </Button>
            )}
            
             {hasCameraPermission === false && (
                <Alert variant="destructive">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                    Please allow camera access in your browser settings to use this feature.
                    </AlertDescription>
                </Alert>
            )}

            {scannedResults.length > 0 && (
              <div className="w-full">
                <h4 className="font-semibold">Scanned this session:</h4>
                <ul className="max-h-32 w-full overflow-y-auto rounded-md border p-2 text-sm">
                  {scannedResults.map((result, i) => (
                      <li key={i} className={cn(
                        {'text-green-600': result.type === 'success'},
                        {'text-red-600': result.type === 'error'},
                        {'text-muted-foreground': result.type === 'info'}
                      )}>
                        {result.message}
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">QR Tools</h1>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {renderQrGenerator()}
        {renderScanner()}
      </div>
    </div>
  );
}
