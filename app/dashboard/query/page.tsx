"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Loader2, Send, Crown, AlertTriangle, Sparkles, Paperclip, X, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from "@/components/ui/progress";
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

export default function QueryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<any>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!query.trim() && files.length === 0) {
      setError("Please enter a query or attach a file");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('query', query.trim() || 'Analyze attached files');
      formData.append('selectedModel', 'auto');
      
      // Add files to form data
      files.forEach((file, index) => {
        formData.append('files', file);
      });
      
      console.log('Submitting with files:', files.map(f => f.name));
      
      const res = await fetch('/api/query', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429 && data.requiresUpgrade) {
          setError(data.error);
          setShowUpgradeDialog(true);
          setUsage(data.usage);
        } else {
          setError(data.error || 'Failed to get response. Please try again.');
        }
        return;
      }
      
      setResult({
        model: data.model,
        reasoning: data.reasoning,
        response: data.response,
        query: query.trim() || 'Analyze attached files',
        timestamp: new Date().toLocaleTimeString(),
      });
      
      setUsage(data.usage);
      toast({ title: 'Success', description: 'Query processed successfully!' });
    } catch (err) {
      console.error('Error submitting query:', err);
      setError("Failed to get response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (result?.response) {
      navigator.clipboard.writeText(result.response);
      toast({ title: 'Copied!', description: 'Response copied to clipboard.' });
    }
  };

  const handleClear = () => {
    setQuery("");
    setFiles([]);
    setResult(null);
    setError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
    e.target.value = '';
  };

  const processFiles = (selectedFiles: File[]) => {
    // Validate file types and sizes
    const validFiles = selectedFiles.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({ 
          title: 'File too large', 
          description: `${file.name} is too large. Maximum size is 10MB.`,
          variant: 'destructive'
        });
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      toast({ 
        title: 'Files attached', 
        description: `${validFiles.length} file(s) added successfully.` 
      });
      setShowFileDialog(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      processFiles(droppedFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-pink-500" />;
    }
    return <FileText className="h-4 w-4 text-blue-500" />;
  };

  const triggerFileInput = () => {
    const fileInput = document.getElementById('file-upload-dialog') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Image 
                src="/neural.png" 
                alt="Neural Logo" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold">AI Query Platform</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Enter your prompt and let our AI choose the best model for you
          </p>
        </div>

        {/* Usage Alert */}
        {usage && usage.plan.name === 'STARTER' && usage.usagePercentage > 80 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              You've used {usage.tokensUsed} of {usage.planLimit} tokens this month.
              {usage.remainingTokens > 0 ? ` ${usage.remainingTokens} tokens remaining.` : ' Please upgrade your plan to continue.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Plan Information and Usage */}
        {usage && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold text-lg">{usage.plan.name} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {usage.plan.name === 'STARTER' && 'Perfect for getting started with AI'}
                      {usage.plan.name === 'PROFESSIONAL' && 'Advanced features for power users'}
                      {usage.plan.name === 'ENTERPRISE' && 'Unlimited access for enterprise needs'}
                    </p>
                  </div>
                </div>
                {usage.plan.name !== 'ENTERPRISE' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/dashboard?tab=billing')}
                    className="border-primary text-primary hover:bg-primary hover:text-white"
                  >
                    Upgrade Plan
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Monthly Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.plan.name === 'STARTER'
                      ? `${usage.tokensUsed} / ${usage.planLimit} tokens`
                      : `${usage.currentUsage} / ${usage.planLimit} requests`}
                  </span>
                </div>
                <Progress value={usage.usagePercentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {usage.plan.name === 'STARTER'
                      ? (usage.remainingTokens > 0 ? `${usage.remainingTokens} tokens remaining` : 'Limit reached')
                      : (usage.remainingRequests > 0 ? `${usage.remainingRequests} requests remaining` : 'Limit reached')}
                  </span>
                  <span>{usage.usagePercentage.toFixed(1)}% used</span>
                </div>
              </div>
              {/* Upgrade Suggestions */}
              {usage.usagePercentage > 70 && usage.plan.name === 'STARTER' && (
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Ready to upgrade?</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        You're approaching your limit. Upgrade to Professional for 1,000,000 tokens/month and advanced features.
                      </p>
                        <Button 
                        size="sm" 
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => router.push('/dashboard?tab=billing')}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {usage.usagePercentage > 80 && usage.plan.name === 'PROFESSIONAL' && (
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-3">
                    <Crown className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-900 dark:text-purple-100">Need unlimited access?</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                        You're using a lot of requests. Consider Enterprise for unlimited requests and priority support.
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => router.push('/dashboard?tab=billing')}
                      >
                        Contact Sales
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Query Form */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Enter Your Prompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Textarea
                  placeholder="Describe what you need... (text, code, images, analysis, etc.)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={6}
                  className="resize-none bg-muted/50 border-2 border-accent focus:border-primary transition text-lg"
                  disabled={isSubmitting}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    disabled={isSubmitting}
                    onClick={() => setShowFileDialog(true)}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach Files
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Support for images, documents, and more (max 10MB each)
                  </span>
                </div>
                
                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {getFileIcon(file)}
                          <div>
                            <span className="text-sm font-medium">{file.name}</span>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={isSubmitting}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  className="flex-1 h-12 text-lg" 
                  disabled={isSubmitting || (!query.trim() && files.length === 0)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Query
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClear} 
                  disabled={isSubmitting || (!query.trim() && files.length === 0)} 
                  className="px-6"
                >
                  Clear
                </Button>
              </div>
            </form>

            {error && (
              <Alert className="mt-6 border-red-200 bg-red-50/50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            
            {result && (
              <div className="mt-8 space-y-4">
                {/* Model Info */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="text-sm">{result.model}</Badge>
                    <span className="text-sm text-muted-foreground">Smart routing selected this model</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {/* File Processing Info */}
                {result.filesProcessed > 0 && (
                  <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Files Processed Successfully
                        </span>
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <p>• {result.filesProcessed} file(s) analyzed</p>
                        {result.hasImages && <p>• Image analysis enabled</p>}
                        {result.hasDocuments && <p>• Document processing enabled</p>}
                        {result.fileTypes && result.fileTypes.length > 0 && (
                          <p>• File types: {result.fileTypes.join(', ')}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Model Details */}
                <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Model Reasoning</span>
                        {result.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(result.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {result.reasoning}
                      </p>
                      {result.estimatedCost && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                          <span>Estimated cost:</span>
                          <span className="font-medium">${result.estimatedCost.toFixed(4)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Response */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="whitespace-pre-line text-base leading-relaxed">{result.response}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload Dialog */}
        <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Attach Files
              </DialogTitle>
              <DialogDescription>
                Upload files to include with your query. Supported formats: images, PDFs, documents, and more.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop files here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-dialog"
                  accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json"
                />
                <Button variant="outline" className="cursor-pointer">
                  Choose Files
                </Button>
              </div>

              {/* File Requirements */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Maximum file size: 10MB per file</p>
                <p>• Supported formats: Images, PDFs, Documents, Text files</p>
                <p>• You can upload multiple files at once</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Upgrade Your Plan
              </DialogTitle>
              <DialogDescription>
                You've reached your monthly limit. Upgrade to continue using GlauberAI.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">Professional</CardTitle>
                    <div className="text-2xl font-bold">$39<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• 50,000 requests/month</li>
                      <li>• All AI models</li>
                      <li>• Advanced routing</li>
                      <li>• Priority support</li>
                    </ul>
                    <Button className="w-full mt-4">Upgrade to Professional</Button>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">Enterprise</CardTitle>
                    <div className="text-2xl font-bold">$299<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Unlimited requests</li>
                      <li>• Custom AI models</li>
                      <li>• Dedicated support</li>
                      <li>• SLA guarantee</li>
                    </ul>
                    <Button className="w-full mt-4">Upgrade to Enterprise</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
} 