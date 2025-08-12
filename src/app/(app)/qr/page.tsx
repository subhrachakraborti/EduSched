"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QrCode, ScanLine, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QrPage() {
  const [qrInput, setQrInput] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const handleGenerateQr = () => {
    if (qrInput.trim()) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrInput.trim())}`);
    }
  };

  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "fail">("idle");
  const [scanMessage, setScanMessage] = useState("Ready to scan attendance.");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (scanState === "scanning") {
      timer = setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate
        if (success) {
          setScanState("success");
          setScanMessage(`Attendance marked for User ID: ${Math.floor(1000 + Math.random() * 9000)}`);
        } else {
          setScanState("fail");
          setScanMessage("Invalid QR Code. Please try again.");
        }
      }, 3000);
    } else if (scanState === "success" || scanState === "fail") {
      timer = setTimeout(() => {
        setScanState("idle");
        setScanMessage("Ready to scan attendance.");
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [scanState]);

  const handleScanClick = () => {
    if (scanState === "idle") {
      setScanState("scanning");
      setScanMessage("Searching for QR Code...");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">QR Tools</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR Code Generator</CardTitle>
            <CardDescription>Create a unique QR code for a student or teacher.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Student/Teacher ID"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
              />
              <Button onClick={handleGenerateQr} className="bg-accent hover:bg-accent/90">Generate</Button>
            </div>
            {qrCodeUrl && (
              <div className="flex justify-center rounded-lg border bg-card-foreground/5 p-4">
                <Image
                  src={qrCodeUrl}
                  alt="Generated QR Code"
                  width={200}
                  height={200}
                  className="rounded-md"
                />
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Attendance Scanner</CardTitle>
            <CardDescription>Scan a QR code to mark attendance.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="relative h-48 w-48 overflow-hidden rounded-lg border-2 border-dashed bg-card-foreground/5">
              {scanState === "idle" && <ScanLine className="h-full w-full text-muted-foreground/30" />}
              {scanState === "scanning" && (
                <>
                  <div className="scanline" />
                  <Loader2 className="absolute inset-0 m-auto h-12 w-12 animate-spin text-primary" />
                </>
              )}
              {scanState === "success" && <CheckCircle className="absolute inset-0 m-auto h-24 w-24 text-green-500" />}
              {scanState === "fail" && <XCircle className="absolute inset-0 m-auto h-24 w-24 text-destructive" />}
            </div>
            <Button onClick={handleScanClick} disabled={scanState !== 'idle'} className="bg-accent hover:bg-accent/90">
              {scanState === "idle" && <><QrCode className="mr-2 h-4 w-4" /> Scan Attendance</>}
              {scanState === "scanning" && <>Scanning...</>}
              {scanState === "success" && <>Scan Successful!</>}
              {scanState === "fail" && <>Scan Failed</>}
            </Button>
            <p className={cn(
                "text-sm text-center h-5",
                scanState === 'success' && 'text-green-600',
                scanState === 'fail' && 'text-destructive',
                'text-muted-foreground'
            )}>
                {scanMessage}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
