import { Plug } from "lucide-react";
import { ChatSettingsSection } from "../ChatSettingsSection";

export interface ChatConnectionOption {
  id: string;
  name: string;
  model?: string;
}

interface ConnectionSectionProps {
  connectionId: string | null;
  connections: ChatConnectionOption[];
  isGame: boolean;
  onConnectionChange: (connectionId: string | null) => void;
}

export function ConnectionSection({ connectionId, connections, isGame, onConnectionChange }: ConnectionSectionProps) {
  return (
    <ChatSettingsSection
      label="Conexão"
      icon={<Plug size="0.875rem" />}
      help={
        isGame
          ? "Choose the model used for game generation in this chat. GM and Party flows share this selection."
          : "Which AI provider and model to use for this chat. 'Random' picks a different connection each time from your random pool."
      }
    >
      {isGame ? (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-[0.6875rem] font-medium text-foreground/50">
              
              Modelo do GM / grupo
            </label>
            <select
              value={connectionId ?? ""}
              onChange={(e) => onConnectionChange(e.target.value || null)}
              className="w-full rounded-lg bg-foreground/5 px-3 py-2 text-xs outline-none ring-1 ring-foreground/10 transition-shadow focus:ring-foreground/20"
            >
              <option value="">Nenhum</option>
              <option value="random">🎲 Aleatório</option>
              {connections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                  {connection.model ? ` — ${connection.model}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <>
          <select
            value={connectionId ?? ""}
            onChange={(e) => onConnectionChange(e.target.value || null)}
            className="w-full rounded-lg bg-foreground/5 px-3 py-2 text-xs outline-none ring-1 ring-foreground/10 transition-shadow focus:ring-foreground/20"
          >
            <option value="">Nenhum</option>
            <option value="random">🎲 Aleatório</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name}
              </option>
            ))}
          </select>
          {connectionId === "random" && (
            <p className="mt-1.5 text-[0.625rem] text-foreground/50">
              
              Cada geração escolherá aleatoriamente entre as conexões marcadas para o pool aleatório.
            </p>
          )}
        </>
      )}
    </ChatSettingsSection>
  );
}
