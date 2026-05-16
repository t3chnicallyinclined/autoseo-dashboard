import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { clips } from "@/data/sample"

const scoreDistData = [
  { range: "0-10", count: 0 },
  { range: "10-20", count: 0 },
  { range: "20-30", count: 0 },
  { range: "30-40", count: 1 },
  { range: "40-50", count: 2 },
  { range: "50-60", count: 3 },
  { range: "60-70", count: 8 },
  { range: "70-80", count: 18 },
  { range: "80-90", count: 24 },
  { range: "90-100", count: 12 },
]

const featureImportance = [
  { feature: "Linguistic markers", importance: 0.31, color: "#3b82f6" },
  { feature: "Prosody (RMS)", importance: 0.22, color: "#8b5cf6" },
  { feature: "Embedding novelty", importance: 0.18, color: "#f59e0b" },
  { feature: "Trend match", importance: 0.14, color: "#22c55e" },
  { feature: "Turn density", importance: 0.09, color: "#ef4444" },
  { feature: "Speaking rate", importance: 0.06, color: "#06b6d4" },
]

const accuracyData = [
  { ep: "JRE #2240", accuracy: 0.71 },
  { ep: "Lex #445", accuracy: 0.74 },
  { ep: "All-In 182", accuracy: 0.79 },
  { ep: "JRE #2244", accuracy: 0.81 },
  { ep: "Lex #448", accuracy: 0.83 },
  { ep: "JRE #2246", accuracy: 0.85 },
  { ep: "JRE #2247", accuracy: 0.87 },
]

const vlmRerank = [
  { id: "c1", hook: "This changes everything about AI regulation", llmRank: 1, finalRank: 1, delta: 0 },
  { id: "c6", hook: "Backpropagation explained in 60 seconds", llmRank: 3, finalRank: 2, delta: +1 },
  { id: "c2", hook: "I've never told anyone this before", llmRank: 2, finalRank: 3, delta: -1 },
  { id: "c5", hook: "GPT-5 is already deployed internally", llmRank: 4, finalRank: 4, delta: 0 },
  { id: "c3", hook: "The real reason I left the company", llmRank: 6, finalRank: 5, delta: +1 },
]

export default function Ranker() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score distribution */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">All clips across all episodes (68 total)</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-48 w-full">
              <BarChart data={scoreDistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="count" fill="#3b82f6" radius={3} />
              </BarChart>
            </ChartContainer>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-4 w-px bg-red-500/70" />
              <span className="text-xs text-muted-foreground">Top-K cutoff (≥ 75)</span>
            </div>
          </CardContent>
        </Card>

        {/* Feature importance */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Feature Importance</CardTitle>
            <p className="text-xs text-muted-foreground">Correlation with high-performing clips</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {featureImportance.map(f => (
              <div key={f.feature}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-foreground">{f.feature}</span>
                  <span className="text-xs font-mono" style={{ color: f.color }}>{(f.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.importance * 100}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* VLM Re-rank Impact */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">VLM Re-rank Impact</CardTitle>
            <p className="text-xs text-muted-foreground">Before → after VLM score blending</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-4 text-xs text-muted-foreground pb-1 border-b border-border">
                <span>LLM #</span>
                <span className="col-span-2">Hook</span>
                <span>Final #</span>
              </div>
              {vlmRerank.map(item => (
                <div key={item.id} className="grid grid-cols-4 items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm font-bold font-mono text-muted-foreground">#{item.llmRank}</span>
                  <span className="col-span-2 text-xs text-foreground truncate">{item.hook}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono text-foreground">#{item.finalRank}</span>
                    {item.delta > 0 && <TrendingUp className="size-3 text-emerald-400" />}
                    {item.delta < 0 && <TrendingDown className="size-3 text-red-400" />}
                    {item.delta === 0 && <Minus className="size-3 text-muted-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Model accuracy over time */}
        <Card className="bg-card border-border card-top-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Ranker Accuracy</CardTitle>
              <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-0">↑ Improving</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Score vs actual CTR correlation per episode</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-48 w-full">
              <LineChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="ep" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0.6, 1]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "11px" }} formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, "Accuracy"]} />
                <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" dot={{ fill: "#3b82f6", r: 3 }} strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranker reasoning explorer */}
      <Card className="bg-card border-border card-top-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Ranker Reasoning Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clips.slice(0, 4).map(clip => (
            <details key={clip.id} className="group rounded-xl bg-accent/20 border border-border overflow-hidden">
              <summary className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30 transition-colors">
                <Badge className={`text-xs border shrink-0 ${clip.rank === 1 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-muted/50 text-muted-foreground border-border"}`}>#{clip.rank}</Badge>
                <span className="text-sm font-medium text-foreground flex-1 truncate">{clip.hook}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-primary">LLM: {clip.llmScore}</span>
                  <span className="text-xs font-mono text-purple-400">VLM: {clip.vlmScore}</span>
                </div>
              </summary>
              <div className="px-3 pb-3">
                <pre className="text-xs font-mono text-muted-foreground bg-background/50 rounded-lg p-3 overflow-x-auto border border-border/50">
{JSON.stringify({
  score: clip.llmScore,
  categories: { linguistic_markers: 28, emotional_intensity: 24, controversy: 22, clarity: 20 },
  hook_text: clip.hook,
  reasoning: "Strong opening hook with universal appeal. High linguistic marker density (claims + confessional). VLM confirms expressive facial gestures at start frame.",
  refined_start: "00:14:22",
  refined_end: `00:${14 + Math.ceil(parseFloat(clip.duration) || 1)}:${(10 + clip.rank * 3).toString().padStart(2,'0')}`,
}, null, 2)}
                </pre>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
