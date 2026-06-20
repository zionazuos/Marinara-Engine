import { Languages } from "lucide-react";
import { HelpTooltip } from "../../../components/ui/HelpTooltip";
import { SettingsSwitch } from "../../../components/panels/settings/SettingControls";
import { ChatSettingsSection } from "../ChatSettingsSection";
import type { ChatConnectionOption } from "./ConnectionSection";

interface TranslationSectionProps {
  metadata: Record<string, unknown>;
  textConnections: ChatConnectionOption[];
  onMetadataChange: (patch: Record<string, unknown>) => void;
}

export function TranslationSection({ metadata, textConnections, onMetadataChange }: TranslationSectionProps) {
  const provider = (metadata.translationProvider as string | undefined) ?? "google";

  return (
    <ChatSettingsSection
      label="Tradução"
      icon={<Languages size="0.875rem" />}
      help="Configure translation for this chat here, including provider, target language, and automatic response translation for Game mode."
    >
      <div className="space-y-3">
        <div>
          <label className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">Provedor</label>
          <select
            value={provider}
            onChange={(e) => onMetadataChange({ translationProvider: e.target.value })}
            className="mt-0.5 w-full rounded-lg bg-[var(--secondary)] px-3 py-2 text-xs outline-none ring-1 ring-transparent transition-shadow focus:ring-[var(--primary)]/40"
          >
            <option value="google">Google Translate</option>
            <option value="deepl">DeepL API</option>
            <option value="deeplx">DeepLX (self-hosted)</option>
            <option value="ai">AI (via connection)</option>
          </select>
        </div>

        <div>
          <label className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">
            
            Idioma de destino
            <HelpTooltip
              text={
                provider === "ai"
                  ? "Language name (e.g. English, Japanese, Spanish)"
                  : "Language code (e.g. en, ja, es, de, fr, zh, ko)"
              }
              size="0.625rem"
            />
          </label>
          <input
            type="text"
            value={(metadata.translationTargetLang as string | undefined) ?? "en"}
            onChange={(e) => onMetadataChange({ translationTargetLang: e.target.value })}
            placeholder={provider === "ai" ? "English" : "en"}
            className="mt-0.5 w-full rounded-lg bg-[var(--secondary)] px-3 py-2 text-xs outline-none ring-1 ring-transparent transition-shadow focus:ring-[var(--primary)]/40"
          />
        </div>

        {provider === "ai" && (
          <div>
            <label className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">
              
              Conexão
              <HelpTooltip text="Which AI connection to use for translation" size="0.625rem" />
            </label>
            <select
              value={(metadata.translationConnectionId as string | undefined) ?? ""}
              onChange={(e) => onMetadataChange({ translationConnectionId: e.target.value })}
              className="mt-0.5 w-full rounded-lg bg-[var(--secondary)] px-3 py-2 text-xs outline-none ring-1 ring-transparent transition-shadow focus:ring-[var(--primary)]/40"
            >
              <option value="">Selecionar conexão…</option>
              {textConnections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {provider === "deepl" && (
          <div>
            <label className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">DeepL API Key</label>
            <input
              type="password"
              value={(metadata.translationDeeplApiKey as string | undefined) ?? ""}
              onChange={(e) => onMetadataChange({ translationDeeplApiKey: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx"
              className="mt-0.5 w-full rounded-lg bg-[var(--secondary)] px-3 py-2 text-xs outline-none ring-1 ring-transparent transition-shadow focus:ring-[var(--primary)]/40"
            />
          </div>
        )}

        {provider === "deeplx" && (
          <div>
            <label className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">
              DeepLX URL
              <HelpTooltip
                text="URL of your self-hosted DeepLX instance (e.g. http://localhost:1188)"
                size="0.625rem"
              />
            </label>
            <input
              type="text"
              value={(metadata.translationDeeplxUrl as string | undefined) ?? ""}
              onChange={(e) => onMetadataChange({ translationDeeplxUrl: e.target.value })}
              placeholder="http://localhost:1188"
              className="mt-0.5 w-full rounded-lg bg-[var(--secondary)] px-3 py-2 text-xs outline-none ring-1 ring-transparent transition-shadow focus:ring-[var(--primary)]/40"
            />
          </div>
        )}

        <TranslationToggle
          enabled={metadata.autoTranslate === true}
          title="Traduzir respostas automaticamente"
          description="Traduzir automaticamente as respostas da IA após a geração."
          onToggle={() => onMetadataChange({ autoTranslate: !metadata.autoTranslate })}
        />
        <TranslationToggle
          enabled={metadata.translateInput === true}
          title="Traduzir minhas mensagens"
          description="Traduza suas mensagens para o idioma de destino antes de enviar."
          onToggle={() => onMetadataChange({ translateInput: !metadata.translateInput })}
        />
        <TranslationToggle
          enabled={metadata.showInputTranslateButton === true}
          title="Mostrar botão de tradução de rascunho"
          description="Adiciona um botão de tradução ao lado de Enviar para você traduzir e editar sua mensagem antes de enviá-la."
          onToggle={() => onMetadataChange({ showInputTranslateButton: !metadata.showInputTranslateButton })}
        />
      </div>
    </ChatSettingsSection>
  );
}

function TranslationToggle({
  enabled,
  title,
  description,
  onToggle,
}: {
  enabled: boolean;
  title: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <SettingsSwitch
      label={title}
      description={description}
      checked={enabled}
      onChange={onToggle}
      labelPosition="start"
      className={[
        "justify-between rounded-lg px-3 py-2.5 text-left",
        enabled
          ? "bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/30"
          : "bg-[var(--secondary)] hover:bg-[var(--accent)]",
      ].join(" ")}
      labelClassName="text-[0.6875rem] font-medium"
    />
  );
}
