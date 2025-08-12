
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode, ScanLine, CheckCircle, XCircle, Video, VideoOff } from "lucide-react";
import { useSchedule } from "@/context/schedule-context";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import jsQR from "jsqr";
import { recordAttendanceAction } from "@/app/actions";
import { Label } from "@/components/ui/label";

export default function QrPage() {
  const { user } = useSchedule();
  const { toast } = useToast();
  
  const [qrStudentId, setQrStudentId] = useState("");
  const [qrSubject, setQrSubject] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  
  const handleGenerateQr = () => {
    const today = new Date().toISOString().slice(0, 10);
    let studentId = "";
    let subject = "";

    if (user?.type === 'student') {
      studentId = user.id;
      // For now, let's use a placeholder subject. This will be updated later.
      subject = "SUB101"; 
    } else {
      studentId = qrStudentId.trim();
      subject = qrSubject.trim();
    }

    if (studentId && subject) {
      const dataToEncode = `${studentId}-${today}-${subject}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`);
    } else {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please provide both Student ID and Subject Code.",
        })
    }
  };

  useEffect(() => {
    // Auto-generate for student on page load
    if (user?.type === 'student') {
      const today = new Date().toISOString().slice(0, 10);
      const subject = "SUB101"; // Placeholder
      const dataToEncode = `${user.id}-${today}-${subject}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`);
    }
  }, [user]);

  const startScan = async () => {
    setScannedCodes([]);
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
    if (scannedCodes.includes(data)) {
        return; // Already scanned this session
    }

    setScannedCodes(prev => [...prev, data]);
    
    const result = await recordAttendanceAction(data);

    if (result.error) {
        toast({
            variant: "destructive",
            title: "Attendance Error",
            description: result.error,
        });
    } else {
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
  }, [isScanning, hasCameraPermission, toast, scannedCodes, handleScan]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">QR Tools</h1>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generator</CardTitle>
            <CardDescription>
              {user?.type === 'student' ? 'Your daily QR code for attendance.' : 'Create a QR code for a student\'s attendance.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {user?.type !== 'student' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                          id="studentId"
                          placeholder="e.g., student001"
                          value={qrStudentId}
                          onChange={(e) => setQrStudentId(e.target.value)}
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="subjectCode">Subject Code</Label>
                      <Input
                          id="subjectCode"
                          placeholder="e.g., SUB101"
                          value={qrSubject}
                          onChange={(e) => setQrSubject(e.target.value)}
                      />
                  </div>
                  <Button onClick={handleGenerateQr} className="w-full bg-accent hover:bg-accent/90">Generate</Button>
                </div>
            )}
            {qrCodeUrl && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card-foreground/5 p-4">
                <Image
                  src={qrCodeUrl}
                  alt="Generated QR Code"
                  width={200}
                  height={200}
                  className="rounded-md"
                />
                {user?.type === 'student' && (
                    <p className="text-center text-sm text-muted-foreground">Show this code to your teacher to mark attendance.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {(user?.type === 'admin' || user?.type === 'teacher') && (
            <Card>
            <CardHeader>
                <CardTitle>Attendance Scanner</CardTitle>
                <CardDescription>Scan a QR code to mark attendance. The camera will scan continuously.</CardDescription>
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

                {scannedCodes.length > 0 && (
                  <div className="w-full">
                    <h4 className="font-semibold">Scanned this session:</h4>
                    <ul className="max-h-24 overflow-y-auto rounded-md border p-2 text-sm text-muted-foreground">
                      {scannedCodes.map((code, i) => <li key={i}>{code.split('-')[0]} - {code.split('-')[2]}</li>)}
                    </ul>
                  </div>
                )}
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
