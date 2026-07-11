import { Grid3X3, Search, RefreshCw, Database, Filter } from "lucide-react";

export default function ModelsPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
        <Grid3X3 className="w-3 h-3" />
        Models Catalog
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-3">Models</h1>
      <p className="text-zinc-400 leading-relaxed mb-10">
        AI Gateway provides access to <strong className="text-zinc-200">500+ AI models</strong> from
        every major provider through the Puter.js SDK. No API keys, no rate
        limits, no complex setup.
      </p>

      {/* Available Providers */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">
        Available Providers
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        {[
          { name: "OpenAI", models: "GPT-4, GPT-4o, o3, o4-mini, GPT-5" },
          { name: "Anthropic", models: "Claude 3.5, Claude 4, Claude Opus" },
          { name: "Google", models: "Gemini 2.0, Gemini 2.5 Pro/Flash" },
          { name: "DeepSeek", models: "DeepSeek-V3, DeepSeek-R1" },
          { name: "Mistral", models: "Mistral Large, Small, Nemo" },
          { name: "xAI", models: "Grok-2, Grok-3" },
          { name: "Meta", models: "Llama 3, Llama 4" },
          { name: "Together", models: "Open-source models hosting" },
          { name: "Replicate", models: "Community & fine-tuned models" },
        ].map((provider, i) => (
          <div
            key={i}
            className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4"
          >
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">
              {provider.name}
            </h3>
            <p className="text-xs text-zinc-500">{provider.models}</p>
          </div>
        ))}
      </div>

      {/* Using the Model Selector */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">
        Using the Model Selector
      </h2>
      <div className="space-y-4 mb-10">
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Search className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                Search & Filter
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Open the model dropdown and start typing to filter models by
                name or provider. Models are grouped by provider for easy
                browsing.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                Refresh Model List
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Click the refresh button in the model selector to fetch the
                latest available models from Puter. New models are added
                regularly.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Filter className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                Context Window
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Each model shows its context window size (e.g., &ldquo;128K
                context&rdquo;). Choose larger context for long documents,
                smaller context for faster responses.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection Tips */}
      <h2 className="text-xl font-semibold text-zinc-200 mb-4">
        Choosing the Right Model
      </h2>
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">
                  Task
                </th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">
                  Recommended Models
                </th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium text-xs">
                  Why
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[
                {
                  task: "General Chat",
                  models: "GPT-4o, Claude 3.5 Sonnet",
                  why: "Best balance of speed & quality",
                },
                {
                  task: "Code Generation",
                  models: "Claude 4 Opus, GPT-5",
                  why: "Superior code reasoning",
                },
                {
                  task: "Creative Writing",
                  models: "Claude 3.5 Sonnet, Gemini 2.5 Pro",
                  why: "Rich, nuanced output",
                },
                {
                  task: "Analysis & Logic",
                  models: "o3, DeepSeek-R1",
                  why: "Strong reasoning capabilities",
                },
                {
                  task: "Fast & Cheap",
                  models: "GPT-4o Mini, Claude 3.5 Haiku",
                  why: "Low cost, high speed",
                },
                {
                  task: "Long Documents",
                  models: "Gemini 2.5 Pro (1M context)",
                  why: "Huge context window",
                },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-zinc-800/20">
                  <td className="px-4 py-3 text-zinc-200 text-xs">{row.task}</td>
                  <td className="px-4 py-3 text-emerald-400 text-xs">
                    {row.models}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl">
        <div className="flex items-start gap-2">
          <Database className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-400">Note:</strong> The model list is
            fetched live from Puter.com. Availability may vary based on your
            region and Puter account status. Use the refresh button to get the
            most up-to-date list.
          </p>
        </div>
      </div>
    </div>
  );
}
