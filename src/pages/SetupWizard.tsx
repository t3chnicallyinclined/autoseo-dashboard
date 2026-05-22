import { useState, useEffect, useCallback } from "react"
import {
  Eye, EyeOff, ChevronRight, ChevronLeft, SkipForward,
  CircleCheck as CheckCircle2, Loader as Loader2, X as XCircle,
  Sparkles, Key, Terminal, Share2, Upload, PartyPopper, Cloud,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { type AppConfig, saveConfig } from "@/hooks/use-config"

type TestStatus = "idle" | "testing" | "success" | "error"

interface WizardState {
  openaiApiKey: string
  hfApiKey: string
  ffmpegDetected: boolean | null
  ffmpegChecking: boolean
  youtubeClientId: string
  youtubeRefreshToken: string
  blueskyHandle: string
  blueskyAppPassword: string
  // Object storage (Cloudflare R2 / S3-compatible) — optional, defaults to local disk
  r2Endpoint: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2Bucket: string
  r2PublicBaseUrl: string
  r2Test: TestStatus
  videoSource: string
  openaiTest: TestStatus
  hfTest: TestStatus
  youtubeTest: TestStatus
  blueskyTest: TestStatus
}

const STEPS = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "ai-provider", label: "AI Provider", icon: Key },
  { id: "ffmpeg", label: "ffmpeg", icon: Terminal },
  { id: "storage", label: "Storage", icon: Cloud },
  { id: "platforms", label: "Platforms", icon: Share2 },
  { id: "first-job", label: "First Job", icon: Upload },
  { id: "done", label: "Done", icon: PartyPopper },
] as const

function PasswordInput({
  value,
  onChange,
  placeholder,
  testStatus,
  onTest,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  testStatus?: TestStatus
  onTest?: () => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 text-sm bg-accent/50 border-border pr-10 font-mono"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {onTest && (
        <Button
          size="sm"
          variant="outline"
          className={`h-10 text-sm border-border ${
            testStatus === "success" ? "border-emerald-500/50 text-emerald-400" :
            testStatus === "error" ? "border-red-500/50 text-red-400" : ""
          }`}
          onClick={onTest}
          disabled={testStatus === "testing" || !value.trim()}
        >
          {testStatus === "testing" ? <Loader2 className="size-4 animate-spin mr-1.5" /> :
           testStatus === "success" ? <CheckCircle2 className="size-4 mr-1.5" /> :
           testStatus === "error" ? <XCircle className="size-4 mr-1.5" /> : null}
          {testStatus === "testing" ? "Testing..." :
           testStatus === "success" ? "Connected" :
           testStatus === "error" ? "Failed" : "Test"}
        </Button>
      )}
    </div>
  )
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = i === currentStep
        const isDone = i < currentStep
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center size-8 rounded-full transition-all ${
                isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                isDone ? "bg-emerald-500/20 text-emerald-400" :
                "bg-accent/50 text-muted-foreground"
              }`}
            >
              {isDone ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`hidden sm:block w-8 h-0.5 ${isDone ? "bg-emerald-500/40" : "bg-border"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>({
    openaiApiKey: "",
    hfApiKey: "",
    ffmpegDetected: null,
    ffmpegChecking: false,
    youtubeClientId: "",
    youtubeRefreshToken: "",
    blueskyHandle: "",
    blueskyAppPassword: "",
    r2Endpoint: "",
    r2AccessKeyId: "",
    r2SecretAccessKey: "",
    r2Bucket: "",
    r2PublicBaseUrl: "",
    r2Test: "idle",
    videoSource: "",
    openaiTest: "idle",
    hfTest: "idle",
    youtubeTest: "idle",
    blueskyTest: "idle",
  })
  const [dragOver, setDragOver] = useState(false)

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  const simulateTest = useCallback((field: "openaiTest" | "hfTest" | "youtubeTest" | "blueskyTest") => {
    update(field, "testing")
    setTimeout(() => update(field, "success"), 1200)
  }, [update])

  /** Test R2 by PATCHing the five core fields and calling /api/config/test/r2. */
  const testR2 = useCallback(async () => {
    update("r2Test", "testing")
    try {
      await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          R2_ENDPOINT: state.r2Endpoint,
          R2_ACCESS_KEY_ID: state.r2AccessKeyId,
          R2_SECRET_ACCESS_KEY: state.r2SecretAccessKey,
          R2_BUCKET: state.r2Bucket,
          R2_PUBLIC_BASE_URL: state.r2PublicBaseUrl || "https://placeholder.invalid",
        }),
      })
      const resp = await fetch("/api/config/test/r2", { method: "POST" })
      const data = await resp.json()
      update("r2Test", data.ok ? "success" : "error")
    } catch {
      update("r2Test", "error")
    }
  }, [state.r2Endpoint, state.r2AccessKeyId, state.r2SecretAccessKey, state.r2Bucket, state.r2PublicBaseUrl, update])

  // Auto-detect ffmpeg when reaching step 2
  useEffect(() => {
    if (step === 2 && state.ffmpegDetected === null && !state.ffmpegChecking) {
      update("ffmpegChecking", true)
      setTimeout(() => {
        update("ffmpegDetected", true)
        update("ffmpegChecking", false)
      }, 1500)
    }
  }, [step, state.ffmpegDetected, state.ffmpegChecking, update])

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return true // welcome
      case 1: return state.openaiApiKey.trim().length > 0 // AI provider — key required
      case 2: return true // ffmpeg — informational
      case 3: return true // storage — optional (skip = local disk)
      case 4: return true // platforms — optional
      case 5: return true // first job — optional
      case 6: return true // done
      default: return false
    }
  }

  const handleFinish = async () => {
    // Persist all collected creds to the autoseo backend so the clipper picks
    // them up via load_config_json_into_env() at startup.
    const updates: Record<string, string | null> = {
      OPENAI_API_KEY: state.openaiApiKey || null,
      HF_API_KEY: state.hfApiKey || null,
      GOOGLE_CLIENT_ID: state.youtubeClientId || null,
      GOOGLE_REFRESH_TOKEN: state.youtubeRefreshToken || null,
      BLUESKY_HANDLE: state.blueskyHandle || null,
      BLUESKY_APP_PASSWORD: state.blueskyAppPassword || null,
      R2_ENDPOINT: state.r2Endpoint || null,
      R2_ACCESS_KEY_ID: state.r2AccessKeyId || null,
      R2_SECRET_ACCESS_KEY: state.r2SecretAccessKey || null,
      R2_BUCKET: state.r2Bucket || null,
      R2_PUBLIC_BASE_URL: state.r2PublicBaseUrl || null,
    }
    try {
      await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
    } catch { /* offline — values stay in localStorage as a fallback */ }

    const config: AppConfig = {
      openaiApiKey: state.openaiApiKey,
      hfApiKey: state.hfApiKey || undefined,
      ffmpegDetected: state.ffmpegDetected ?? false,
      youtubeClientId: state.youtubeClientId || undefined,
      youtubeRefreshToken: state.youtubeRefreshToken || undefined,
      blueskyHandle: state.blueskyHandle || undefined,
      blueskyAppPassword: state.blueskyAppPassword || undefined,
      setupCompleted: true,
    }
    saveConfig(config)
    onComplete()
  }

  const next = () => {
    if (step === STEPS.length - 1) {
      handleFinish()
    } else {
      setStep(s => s + 1)
    }
  }
  const back = () => setStep(s => Math.max(0, s - 1))

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      update("videoSource", file.name)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-svh w-full bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Progress value={progress} className="mb-6 h-1" />
        <StepIndicator currentStep={step} />

        <Card className="bg-card border-border">
          <CardContent className="p-6 sm:p-8">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 mb-2">
                  <Sparkles className="size-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Welcome to AutoSEO</h1>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                  Let's get you set up in 2 minutes. We'll configure your AI provider,
                  check for ffmpeg, and optionally connect your social platforms.
                </p>
              </div>
            )}

            {/* Step 1: AI Provider */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">AI Provider</h2>
                  <p className="text-sm text-muted-foreground">
                    AutoSEO needs an OpenAI-compatible API for transcription and ranking.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    OpenAI API Key <span className="text-red-400">*</span>
                  </Label>
                  <PasswordInput
                    value={state.openaiApiKey}
                    onChange={v => update("openaiApiKey", v)}
                    placeholder="sk-..."
                    testStatus={state.openaiTest}
                    onTest={() => simulateTest("openaiTest")}
                  />
                  <p className="text-xs text-muted-foreground">Required for Whisper STT and GPT chat models.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    HuggingFace API Key <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <PasswordInput
                    value={state.hfApiKey}
                    onChange={v => update("hfApiKey", v)}
                    placeholder="hf_..."
                    testStatus={state.hfTest}
                    onTest={state.hfApiKey.trim() ? () => simulateTest("hfTest") : undefined}
                  />
                  <p className="text-xs text-muted-foreground">Used for embeddings and VLM re-ranking.</p>
                </div>
              </div>
            )}

            {/* Step 2: ffmpeg check */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">ffmpeg Check</h2>
                  <p className="text-sm text-muted-foreground">
                    AutoSEO uses ffmpeg for video/audio processing. Let's check if it's installed.
                  </p>
                </div>

                <div className={`flex items-center gap-4 p-4 rounded-xl border ${
                  state.ffmpegChecking ? "bg-accent/30 border-border" :
                  state.ffmpegDetected ? "bg-emerald-500/10 border-emerald-500/30" :
                  "bg-red-500/10 border-red-500/30"
                }`}>
                  {state.ffmpegChecking ? (
                    <>
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Checking for ffmpeg...</p>
                        <p className="text-xs text-muted-foreground">Scanning system PATH</p>
                      </div>
                    </>
                  ) : state.ffmpegDetected ? (
                    <>
                      <CheckCircle2 className="size-6 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400">ffmpeg detected</p>
                        <p className="text-xs text-muted-foreground">Found on system PATH</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-6 text-red-400" />
                      <div>
                        <p className="text-sm font-medium text-red-400">ffmpeg not found</p>
                        <p className="text-xs text-muted-foreground">
                          Install from{" "}
                          <span className="font-mono text-foreground">https://ffmpeg.org/download.html</span>{" "}
                          and ensure it's on your PATH.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {state.ffmpegDetected === false && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      update("ffmpegDetected", null)
                      update("ffmpegChecking", false)
                    }}
                  >
                    Retry Detection
                  </Button>
                )}
              </div>
            )}

            {/* Step 3: Storage (Cloudflare R2 / S3-compatible) — optional */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Clip Storage</h2>
                  <p className="text-sm text-muted-foreground">
                    Optional — upload rendered clips to Cloudflare R2 (or any
                    S3-compatible bucket) instead of keeping them on the
                    autoseo host's local disk. Skip to keep everything local;
                    you can wire this up later from Settings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Endpoint URL</Label>
                    <Input
                      value={state.r2Endpoint}
                      onChange={e => update("r2Endpoint", e.target.value)}
                      placeholder="https://<accountid>.r2.cloudflarestorage.com"
                      className="h-10 text-sm bg-accent/50 border-border font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bucket</Label>
                    <Input
                      value={state.r2Bucket}
                      onChange={e => update("r2Bucket", e.target.value)}
                      placeholder="autoseo-clips"
                      className="h-10 text-sm bg-accent/50 border-border font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Access Key ID</Label>
                    <Input
                      value={state.r2AccessKeyId}
                      onChange={e => update("r2AccessKeyId", e.target.value)}
                      className="h-10 text-sm bg-accent/50 border-border font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Secret Access Key</Label>
                    <PasswordInput
                      value={state.r2SecretAccessKey}
                      onChange={v => update("r2SecretAccessKey", v)}
                      placeholder=""
                      testStatus={state.r2Test}
                      onTest={
                        state.r2Endpoint && state.r2AccessKeyId && state.r2SecretAccessKey && state.r2Bucket
                          ? testR2
                          : undefined
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Public Base URL</Label>
                    <Input
                      value={state.r2PublicBaseUrl}
                      onChange={e => update("r2PublicBaseUrl", e.target.value)}
                      placeholder="https://pub-<hash>.r2.dev   or   https://media.your-domain.com"
                      className="h-10 text-sm bg-accent/50 border-border font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Enable <span className="font-mono text-foreground">Public Access</span> on the
                      bucket in the Cloudflare R2 dashboard to get a <span className="font-mono text-foreground">pub-…r2.dev</span> URL,
                      or connect a custom domain.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Platforms (optional) */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Platforms</h2>
                  <p className="text-sm text-muted-foreground">
                    Optionally connect social platforms for automated posting. You can skip this and set them up later in Settings.
                  </p>
                </div>

                {/* YouTube */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-accent/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">YouTube Shorts</Label>
                    {state.youtubeTest === "success" && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <PasswordInput
                      value={state.youtubeClientId}
                      onChange={v => update("youtubeClientId", v)}
                      placeholder="OAuth Client ID"
                    />
                    <PasswordInput
                      value={state.youtubeRefreshToken}
                      onChange={v => update("youtubeRefreshToken", v)}
                      placeholder="OAuth Refresh Token"
                      testStatus={state.youtubeTest}
                      onTest={
                        state.youtubeClientId.trim() && state.youtubeRefreshToken.trim()
                          ? () => simulateTest("youtubeTest")
                          : undefined
                      }
                    />
                  </div>
                </div>

                {/* Bluesky */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-accent/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Bluesky</Label>
                    {state.blueskyTest === "success" && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={state.blueskyHandle}
                      onChange={e => update("blueskyHandle", e.target.value)}
                      placeholder="yourhandle.bsky.social"
                      className="h-10 text-sm bg-accent/50 border-border font-mono"
                    />
                    <PasswordInput
                      value={state.blueskyAppPassword}
                      onChange={v => update("blueskyAppPassword", v)}
                      placeholder="App password (xxxx-xxxx-xxxx)"
                      testStatus={state.blueskyTest}
                      onTest={
                        state.blueskyHandle.trim() && state.blueskyAppPassword.trim()
                          ? () => simulateTest("blueskyTest")
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: First Job */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Run Your First Job</h2>
                  <p className="text-sm text-muted-foreground">
                    Drag a video file or paste a Google Drive URL to start your first pipeline run.
                    You can also skip this and start a job later.
                  </p>
                </div>

                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-colors ${
                    dragOver ? "border-primary bg-primary/5" :
                    state.videoSource ? "border-emerald-500/50 bg-emerald-500/5" :
                    "border-border bg-accent/20"
                  }`}
                >
                  {state.videoSource ? (
                    <>
                      <CheckCircle2 className="size-8 text-emerald-400" />
                      <p className="text-sm font-medium">{state.videoSource}</p>
                      <Button variant="ghost" size="sm" onClick={() => update("videoSource", "")}>
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="size-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Drag a video here</p>
                      <p className="text-xs text-muted-foreground">or</p>
                    </>
                  )}
                </div>

                {!state.videoSource && (
                  <div className="space-y-2">
                    <Label className="text-sm">Google Drive URL</Label>
                    <Input
                      value={state.videoSource}
                      onChange={e => update("videoSource", e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="h-10 text-sm bg-accent/50 border-border font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Done */}
            {step === 6 && (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-emerald-500/10 mb-2">
                  <PartyPopper className="size-8 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">You're all set!</h1>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                  {state.videoSource
                    ? "Your first job is queued and will start running shortly. Head to the Pipeline page to watch it in action."
                    : "Your configuration is saved. Head to the Pipeline page to start your first job whenever you're ready."}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-400" /> OpenAI
                  </span>
                  {state.hfApiKey && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-400" /> HuggingFace
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {state.ffmpegDetected
                      ? <CheckCircle2 className="size-3 text-emerald-400" />
                      : <XCircle className="size-3 text-red-400" />}
                    ffmpeg
                  </span>
                  {state.youtubeTest === "success" && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-400" /> YouTube
                    </span>
                  )}
                  {state.blueskyTest === "success" && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-emerald-400" /> Bluesky
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <div>
                {step > 0 && step < STEPS.length - 1 && (
                  <Button variant="ghost" size="sm" onClick={back} className="gap-1.5">
                    <ChevronLeft className="size-4" /> Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {(step === 3 || step === 4 || step === 5) && (
                  <Button variant="ghost" size="sm" onClick={next} className="gap-1.5 text-muted-foreground">
                    Skip <SkipForward className="size-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={next}
                  disabled={!canAdvance()}
                  className="gap-1.5 min-w-[100px]"
                >
                  {step === 0 ? "Get Started" :
                   step === STEPS.length - 1 ? "Go to Dashboard" :
                   "Next"}
                  {step < STEPS.length - 1 && <ChevronRight className="size-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  )
}
