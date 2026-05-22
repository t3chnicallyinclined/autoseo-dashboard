import { useState, useEffect, useCallback } from "react"
import { Save, Eye, EyeOff, CircleCheck as CheckCircle2, Loader as Loader2, AlertTriangle, X as XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const settingsSections = ["General", "AI Models", "Rendering", "Posting", "Credentials", "Cost", "Advanced"]

type TestStatus = "idle" | "testing" | "ok" | "error"

interface ConfigState {
  [key: string]: string | number | boolean | null
}

function MaskedInput({
  label,
  configKey,
  value,
  onChange,
  testService,
}: {
  label: string
  configKey: string
  value: string
  onChange: (key: string, val: string) => void
  testService?: string
}) {
  const [show, setShow] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>("idle")
  const [testMsg, setTestMsg] = useState("")

  const handleTest = async () => {
    if (!testService) return
    setTestStatus("testing")
    try {
      const resp = await fetch(`/api/config/test/${testService}`, { method: "POST" })
      const data = await resp.json()
      setTestStatus(data.ok ? "ok" : "error")
      setTestMsg(data.message)
    } catch {
      setTestStatus("error")
      setTestMsg("Network error")
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={e => onChange(configKey, e.target.value)}
            placeholder={`Enter ${label}...`}
            className="h-8 text-xs bg-accent/50 border-border pr-9 font-mono"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
        {testService && (
          <Button
            size="sm"
            variant="outline"
            className={`h-8 text-xs border-border ${testStatus === "ok" ? "border-emerald-500/50 text-emerald-400" : testStatus === "error" ? "border-red-500/50 text-red-400" : ""}`}
            onClick={handleTest}
            disabled={testStatus === "testing"}
            title={testMsg}
          >
            {testStatus === "testing" ? <Loader2 className="size-3 animate-spin mr-1" /> : testStatus === "ok" ? <CheckCircle2 className="size-3 mr-1" /> : testStatus === "error" ? <XCircle className="size-3 mr-1" /> : null}
            {testStatus === "testing" ? "Testing..." : testStatus === "ok" ? "OK" : testStatus === "error" ? "Fail" : "Test"}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("General")
  const [config, setConfig] = useState<ConfigState>({})
  const [needsSetup, setNeedsSetup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await fetch("/api/config")
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setConfig(data.config ?? {})
      setNeedsSetup(data.needs_setup)
      setDirty(false)
    } catch {
      // API not reachable — leave empty config
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  // If needs_setup, redirect to Credentials section
  useEffect(() => {
    if (needsSetup && !loading) {
      setActiveSection("Credentials")
    }
  }, [needsSetup, loading])

  const updateField = (key: string, value: string | number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setDirty(true)
    setSaveMsg("")
  }

  const getStr = (key: string, fallback = ""): string => {
    const v = config[key]
    if (v === undefined || v === null) return fallback
    return String(v)
  }

  const getNum = (key: string, fallback = 0): number => {
    const v = config[key]
    if (v === undefined || v === null) return fallback
    const n = Number(v)
    return isNaN(n) ? fallback : n
  }

  const getBool = (key: string, fallback = false): boolean => {
    const v = config[key]
    if (v === undefined || v === null) return fallback
    if (typeof v === "boolean") return v
    return v === "true"
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg("")
    try {
      const resp = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setConfig(data.config ?? {})
      setNeedsSetup(data.needs_setup)
      setDirty(false)
      setSaveMsg("Saved")
      setTimeout(() => setSaveMsg(""), 3000)
    } catch (e) {
      setSaveMsg(`Error: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Setup banner */}
      {needsSetup && (
        <div className="fixed top-16 left-0 right-0 z-50 px-6">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            <AlertTriangle className="size-4 shrink-0" />
            <span>First-time setup — enter your API credentials below to get started.</span>
          </div>
        </div>
      )}

      {/* Section nav */}
      <Card className="bg-card border-border w-40 shrink-0 h-fit">
        <CardContent className="p-2">
          {settingsSections.map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${activeSection === s ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
            >
              {s}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Main settings */}
      <div className="flex-1 space-y-4">
        {activeSection === "General" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Work Directory", key: "WORK_DIR", fallback: "./work" },
                { label: "Database Path", key: "CLIPPER_DB", fallback: "./work/clipper.db" },
                { label: "Poll Interval (seconds)", key: "POLL_INTERVAL_SECS", fallback: "60" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input
                    value={getStr(f.key, f.fallback)}
                    onChange={e => updateField(f.key, e.target.value)}
                    className="h-8 text-xs bg-accent/50 border-border font-mono"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pipeline Mode</Label>
                <Select value={getStr("MODE", "seo-only")} onValueChange={v => updateField("MODE", v)}>
                  <SelectTrigger className="h-8 text-xs bg-accent/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="seo-only" className="text-xs">SEO Only</SelectItem>
                    <SelectItem value="clipper" className="text-xs">Clipper Only</SelectItem>
                    <SelectItem value="both" className="text-xs">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "AI Models" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">AI Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "STT Model", key: "OPENAI_STT_MODEL", fallback: "whisper-1" },
                { label: "Chat Model", key: "OPENAI_CHAT_MODEL", fallback: "gpt-4o" },
                { label: "Embedding Model", key: "EMBED_MODEL", fallback: "BAAI/bge-large-en-v1.5" },
              ].map(m => (
                <div key={m.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{m.label}</Label>
                  <Input
                    value={getStr(m.key, m.fallback)}
                    onChange={e => updateField(m.key, e.target.value)}
                    className="h-8 text-xs bg-accent/50 border-border font-mono"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-foreground">VLM Re-ranking</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Enable vision-language model scoring</p>
                </div>
                <Switch
                  checked={getBool("VLM_RERANK_ENABLED")}
                  onCheckedChange={v => updateField("VLM_RERANK_ENABLED", v)}
                />
              </div>
              {getBool("VLM_RERANK_ENABLED") && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">VLM Blend Weight</Label>
                    <span className="text-xs font-mono text-purple-400">{Math.round(getNum("VLM_BLEND_WEIGHT", 0.5) * 100)}%</span>
                  </div>
                  <Slider
                    value={[Math.round(getNum("VLM_BLEND_WEIGHT", 0.5) * 100)]}
                    onValueChange={([v]) => updateField("VLM_BLEND_WEIGHT", v / 100)}
                    min={0} max={100} step={5}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "Posting" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">Posting Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dry run toggle */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${getBool("POST_DRY_RUN", true) ? "bg-purple-500/10 border-purple-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className={`text-sm font-semibold ${getBool("POST_DRY_RUN", true) ? "text-purple-400" : "text-red-400"}`}>Dry Run Mode</Label>
                    {getBool("POST_DRY_RUN", true) ? (
                      <Badge className="text-xs bg-purple-500/20 text-purple-400 border-0">SAFE</Badge>
                    ) : (
                      <Badge className="text-xs bg-red-500/20 text-red-400 border-0">LIVE — POSTING REAL</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getBool("POST_DRY_RUN", true) ? "Simulating posts — nothing will be sent" : "Posts are being sent to real platforms"}
                  </p>
                </div>
                <Switch
                  checked={getBool("POST_DRY_RUN", true)}
                  onCheckedChange={v => updateField("POST_DRY_RUN", v)}
                />
              </div>

              {/* Platform toggles */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">Enabled Platforms</p>
                <div className="space-y-3">
                  {[
                    { name: "YouTube Shorts", key: "youtube" },
                    { name: "Bluesky", key: "bluesky" },
                    { name: "Ayrshare (TikTok/Instagram)", key: "ayrshare" },
                  ].map(p => {
                    const platforms = getStr("POST_ENABLED_PLATFORMS", "").split(",").filter(Boolean)
                    const enabled = platforms.includes(p.key)
                    return (
                      <div key={p.key} className="flex items-center justify-between">
                        <Label className="text-xs text-foreground">{p.name}</Label>
                        <Switch
                          checked={enabled}
                          onCheckedChange={v => {
                            const current = getStr("POST_ENABLED_PLATFORMS", "").split(",").filter(Boolean)
                            const next = v ? [...current, p.key] : current.filter(k => k !== p.key)
                            updateField("POST_ENABLED_PLATFORMS", next.join(","))
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "Credentials" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">API Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MaskedInput label="OpenAI API Key" configKey="OPENAI_API_KEY" value={getStr("OPENAI_API_KEY")} onChange={updateField} testService="openai" />
              <MaskedInput label="HuggingFace Token" configKey="HF_API_KEY" value={getStr("HF_API_KEY")} onChange={updateField} testService="huggingface" />
              <Separator />
              <p className="text-xs text-muted-foreground font-medium">Google OAuth</p>
              <MaskedInput label="Client ID" configKey="GOOGLE_CLIENT_ID" value={getStr("GOOGLE_CLIENT_ID")} onChange={updateField} />
              <MaskedInput label="Client Secret" configKey="GOOGLE_CLIENT_SECRET" value={getStr("GOOGLE_CLIENT_SECRET")} onChange={updateField} />
              <MaskedInput label="Refresh Token" configKey="GOOGLE_REFRESH_TOKEN" value={getStr("GOOGLE_REFRESH_TOKEN")} onChange={updateField} testService="google" />
              <Separator />
              <p className="text-xs text-muted-foreground font-medium">Bluesky</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Handle</Label>
                <Input
                  value={getStr("BLUESKY_HANDLE")}
                  onChange={e => updateField("BLUESKY_HANDLE", e.target.value)}
                  placeholder="you.bsky.social"
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
              <MaskedInput label="App Password" configKey="BLUESKY_APP_PASSWORD" value={getStr("BLUESKY_APP_PASSWORD")} onChange={updateField} testService="bluesky" />
              <Separator />
              <MaskedInput label="Ayrshare API Key" configKey="AYRSHARE_API_KEY" value={getStr("AYRSHARE_API_KEY")} onChange={updateField} testService="ayrshare" />
              <Separator />
              <p className="text-xs text-muted-foreground font-medium">Object Storage (Cloudflare R2 / S3-compatible)</p>
              <p className="text-[11px] text-muted-foreground/70">
                When set, rendered clips upload to your bucket and the dashboard reads
                them from the public URL instead of the local <code>/media/clipper/*</code> proxy.
                Leave blank to keep clips on the autoseo host's local disk.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                <Input
                  value={getStr("R2_ENDPOINT")}
                  onChange={e => updateField("R2_ENDPOINT", e.target.value)}
                  placeholder="https://<accountid>.r2.cloudflarestorage.com"
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bucket</Label>
                <Input
                  value={getStr("R2_BUCKET")}
                  onChange={e => updateField("R2_BUCKET", e.target.value)}
                  placeholder="autoseo-clips"
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
              <MaskedInput label="Access Key ID" configKey="R2_ACCESS_KEY_ID" value={getStr("R2_ACCESS_KEY_ID")} onChange={updateField} />
              <MaskedInput label="Secret Access Key" configKey="R2_SECRET_ACCESS_KEY" value={getStr("R2_SECRET_ACCESS_KEY")} onChange={updateField} testService="r2" />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Public Base URL</Label>
                <Input
                  value={getStr("R2_PUBLIC_BASE_URL")}
                  onChange={e => updateField("R2_PUBLIC_BASE_URL", e.target.value)}
                  placeholder="https://pub-<hash>.r2.dev   or   https://media.your-domain.com"
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Key Prefix (optional)</Label>
                <Input
                  value={getStr("R2_KEY_PREFIX", "clipper")}
                  onChange={e => updateField("R2_KEY_PREFIX", e.target.value)}
                  placeholder="clipper"
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground font-medium">YouTube downloader (yt-dlp)</p>
              <p className="text-[11px] text-muted-foreground/70">
                YouTube increasingly requires signed-in cookies to download.
                Set one of these so the worker can pull cookies from your local
                browser or a Netscape-format cookies.txt file. Leave both blank
                to use yt-dlp with no auth (works for most non-YouTube sites).
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cookies from browser</Label>
                <Input
                  value={getStr("YTDLP_COOKIES_BROWSER")}
                  onChange={e => updateField("YTDLP_COOKIES_BROWSER", e.target.value)}
                  placeholder="firefox  |  chrome  |  chromium  |  brave  |  edge  |  safari"
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Or path to cookies.txt</Label>
                <Input
                  value={getStr("YTDLP_COOKIES_FILE")}
                  onChange={e => updateField("YTDLP_COOKIES_FILE", e.target.value)}
                  placeholder="/path/to/cookies.txt"
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "Rendering" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">Rendering Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Render Formats (comma-separated)</Label>
                <Input
                  value={getStr("CLIP_RENDER_FORMATS", "9x16,1x1,16x9")}
                  onChange={e => updateField("CLIP_RENDER_FORMATS", e.target.value)}
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Top K Clips</Label>
                <Input
                  type="number"
                  value={getStr("CLIP_TOP_K", "10")}
                  onChange={e => updateField("CLIP_TOP_K", e.target.value)}
                  className="h-8 text-xs bg-accent/50 border-border font-mono"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "Cost" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">Cost & Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Budget settings are managed per-deployment. Model cost rates are informational only.</p>
              {[
                { label: "STT Concurrency", key: "STT_CONCURRENCY", fallback: "500" },
                { label: "STT RPM Limit (0=unlimited)", key: "STT_RPM_LIMIT", fallback: "0" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input
                    type="number"
                    value={getStr(f.key, f.fallback)}
                    onChange={e => updateField(f.key, e.target.value)}
                    className="h-8 text-xs bg-accent/50 border-border font-mono"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeSection === "Advanced" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "OpenAI Base URL", key: "OPENAI_BASE_URL", fallback: "https://api.openai.com" },
                { label: "HF Router URL", key: "HF_ROUTER_URL", fallback: "https://router.huggingface.co" },
                { label: "FFmpeg Path", key: "FFMPEG", fallback: "ffmpeg" },
                { label: "FFprobe Path", key: "FFPROBE", fallback: "ffprobe" },
                { label: "VAD Backend", key: "VAD_BACKEND", fallback: "silero" },
                { label: "STT Backend", key: "STT_BACKEND", fallback: "api" },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input
                    value={getStr(f.key, f.fallback)}
                    onChange={e => updateField(f.key, e.target.value)}
                    className="h-8 text-xs bg-accent/50 border-border font-mono"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saveMsg && (
            <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
              {saveMsg}
            </span>
          )}
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          <Button
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
