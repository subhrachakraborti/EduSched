
"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode, ScanLine, CheckCircle, XCircle, Loader2, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSchedule } from "@/context/schedule-context";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import jsQR from "jsqr";
import { recordAttendanceAction } from "@/app/actions";

export default function QrPage() {
  const { user } = useSchedule();
  const { toast } = useToast();
  
  const [qrInput, setQrInput] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleGenerateQr = () => {
    let dataToEncode = "";
    if (user?.type === 'student') {
      const today = new Date().toISOString().slice(0, 10);
      // For now, let's use a placeholder subject. This will be updated later.
      const subject = "SUB101";
      dataToEncode = `${user.id}-${today}-${subject}`;
    } else {
      dataToEncode = qrInput.trim();
    }

    if (dataToEncode) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`);
    }
  };

  useEffect(() => {
    if (user?.type === 'student') {
      const today = new Date().toISOString().slice(0, 10);
      const subject = "SUB101"; // Placeholder
      const dataToEncode = `${user.id}-${today}-${subject}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataToEncode)}`);
    }
  }, [user]);

  const startScan = async () => {
    setLastScannedResult(null);
    setScannedCodes([]);
    setScanError(null);
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

    setLastScannedResult(data);
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

        if (code && code.data && code.data !== lastScannedResult) {
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
      stopScan();
    };
  }, [isScanning, hasCameraPermission, toast, lastScannedResult]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">QR Tools</h1>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generator</CardTitle>
            <CardDescription>
              {user?.type === 'student' ? 'Your daily QR code for attendance.' : 'Create a unique QR code for a student or teacher.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {user?.type !== 'student' && (
                <div className="flex gap-2">
                <Input
                    placeholder="Enter data to encode"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                />
                <Button onClick={handleGenerateQr} className="bg-accent hover:bg-accent/90">Generate</Button>
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
                      {lastScannedResult && <div className="absolute bottom-2 left-2 right-2 rounded-md bg-black/50 p-2 text-white text-center text-sm backdrop-blur-sm">Last scan: {lastScannedResult}</div>}
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                       {lastScannedResult && <CheckCircle className="h-16 w-16 text-green-500" />}
                       {scanError && <XCircle className="h-16 w-16 text-destructive" />}
                      {!lastScannedResult && !scanError && <QrCode className="h-16 w-16" />}
                      <p className="text-center text-sm">
                        {lastScannedResult ? `Last Scanned: ${lastScannedResult}` : scanError || "Ready to scan."}
                      </p>
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
                      {scannedCodes.map((code, i) => <li key={i}>{code}</li>)}
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

    