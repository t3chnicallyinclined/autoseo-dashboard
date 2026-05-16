import { useState } from "react"
import { Save, Eye, EyeOff, CircleCheck as CheckCircle2, Loader as Loader2 } from "lucide-react"
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

function MaskedInput({ label, placeholder }: { label: string; placeholder: string }) {
  const [show, setShow] = useState(false)
  const [value, setValue] = useState("sk-••••••••••••••••")
  const [testing, setTesting] = useState(false)
  const [tested, setTested] = useState(false)

  const handleTest = () => {
    setTesting(true)
    setTimeout(() => { setTesting(false); setTested(true) }, 1500)
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-xs bg-accent/50 border-border pr-9 font-mono"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className={`h-8 text-xs border-border ${tested ? "border-emerald-500/50 text-emerald-400" : ""}`}
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? <Loader2 className="size-3 animate-spin mr-1" /> : tested ? <CheckCircle2 className="size-3 mr-1" /> : null}
          {testing ? "Testing..." : tested ? "OK" : "Test"}
        </Button>
      </div>
    </div>
  )
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("General")
  const [dryRun, setDryRun] = useState(false)
  const [vlmEnabled, setVlmEnabled] = useState(true)
  const [vlmBlend, setVlmBlend] = useState([30])

  return (
    <div className="flex gap-4 h-full">
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
                { label: "Work Directory", placeholder: "/data/autoseo", value: "/data/autoseo" },
                { label: "Database Path", placeholder: "/data/autoseo.db", value: "/data/autoseo.db" },
                { label: "Poll Interval (seconds)", placeholder: "300", value: "300" },
              ].map(f => (
                <div key={f.label} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input defaultValue={f.value} className="h-8 text-xs bg-accent/50 border-border font-mono" />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pipeline Mode</Label>
                <Select defaultValue="both">
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
                { label: "STT Model", default: "whisper-large-v3" },
                { label: "Chat Model", default: "gpt-4o" },
                { label: "Embedding Model", default: "text-embedding-3-small" },
              ].map(m => (
                <div key={m.label} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{m.label}</Label>
                  <Input defaultValue={m.default} className="h-8 text-xs bg-accent/50 border-border font-mono" />
                </div>
              ))}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-foreground">VLM Re-ranking</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Enable vision-language model scoring</p>
                </div>
                <Switch checked={vlmEnabled} onCheckedChange={setVlmEnabled} />
              </div>
              {vlmEnabled && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">VLM Blend Weight</Label>
                    <span className="text-xs font-mono text-purple-400">{vlmBlend[0]}%</span>
                  </div>
                  <Slider value={vlmBlend} onValueChange={setVlmBlend} min={0} max={100} step={5} className="w-full" />
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
              {/* Dry run toggle — prominent */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${dryRun ? "bg-purple-500/10 border-purple-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <Label className={`text-sm font-semibold ${dryRun ? "text-purple-400" : "text-red-400"}`}>Dry Run Mode</Label>
                    {dryRun ? (
                      <Badge className="text-xs bg-purple-500/20 text-purple-400 border-0">SAFE</Badge>
                    ) : (
                      <Badge className="text-xs bg-red-500/20 text-red-400 border-0">LIVE — POSTING REAL</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dryRun ? "Simulating posts — nothing will be sent" : "Posts are being sent to real platforms"}
                  </p>
                </div>
                <Switch checked={dryRun} onCheckedChange={setDryRun} />
              </div>

              {/* Platform toggles */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">Enabled Platforms</p>
                <div className="space-y-3">
                  {[
                    { name: "YouTube Shorts", enabled: true },
                    { name: "Bluesky", enabled: true },
                    { name: "TikTok", enabled: false },
                    { name: "Instagram Reels", enabled: false },
                    { name: "LinkedIn", enabled: true },
                    { name: "Threads", enabled: true },
                  ].map(p => (
                    <div key={p.name} className="flex items-center justify-between">
                      <Label className="text-xs text-foreground">{p.name}</Label>
                      <Switch defaultChecked={p.enabled} />
                    </div>
                  ))}
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
              <MaskedInput label="OpenAI API Key" placeholder="sk-..." />
              <MaskedInput label="HuggingFace Token" placeholder="hf_..." />
              <Separator />
              <MaskedInput label="YouTube OAuth Client ID" placeholder="..." />
              <MaskedInput label="YouTube OAuth Refresh Token" placeholder="..." />
              <Separator />
              <MaskedInput label="Bluesky App Password" placeholder="xxxx-xxxx-xxxx" />
              <MaskedInput label="LinkedIn Access Token" placeholder="..." />
              <MaskedInput label="Ayrshare API Key" placeholder="..." />
            </CardContent>
          </Card>
        )}

        {activeSection === "Cost" && (
          <Card className="bg-card border-border card-top-border">
            <CardHeader>
              <CardTitle className="text-sm">Cost & Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Monthly Budget ($)</Label>
                <Input defaultValue="50.00" className="h-8 text-xs bg-accent/50 border-border font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Alert at % of budget</Label>
                <Input defaultValue="75" className="h-8 text-xs bg-accent/50 border-border font-mono" />
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">Per-model cost rates ($/1M tokens)</p>
              {[
                { model: "gpt-4o input", rate: "2.50" },
                { model: "gpt-4o output", rate: "10.00" },
                { model: "whisper", rate: "6.00/hr" },
                { model: "text-embedding-3-small", rate: "0.02" },
              ].map(m => (
                <div key={m.model} className="flex items-center gap-3">
                  <span className="text-xs text-foreground flex-1 font-mono">{m.model}</span>
                  <Input defaultValue={m.rate} className="h-7 w-24 text-xs bg-accent/50 border-border font-mono text-right" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1.5">
            <Save className="size-3" /> Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
