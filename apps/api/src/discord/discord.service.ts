import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * DiscordService — integración con la API REST de Discord (no discord.js)
 * para mantener la huella del servidor ligera.
 *
 * Variables de entorno necesarias:
 *   DISCORD_BOT_TOKEN        — token del bot
 *   DISCORD_GUILD_ID         — ID del servidor de GamingArena
 *   DISCORD_CATEGORY_MATCHES — ID de la categoría donde se crean los canales de partida
 *   DISCORD_JUEZ_ROLE_ID     — ID del rol que siempre puede ver los canales de partida
 */
@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly BASE = 'https://discord.com/api/v10';

  private readonly token: string;
  private readonly guildId: string;
  private readonly categoryId: string;
  private readonly juezRoleId: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.token = config.get<string>('DISCORD_BOT_TOKEN') ?? '';
    this.guildId = config.get<string>('DISCORD_GUILD_ID') ?? '';
    this.categoryId = config.get<string>('DISCORD_CATEGORY_MATCHES') ?? '';
    this.juezRoleId = config.get<string>('DISCORD_JUEZ_ROLE_ID') ?? '';
    this.enabled = !!(this.token && this.guildId && this.categoryId);
  }

  // ── Crear canal de texto para una partida ─────────────────────────────────

  /**
   * Crea un canal de texto privado dentro de la categoría de partidas.
   * Solo pueden verlo: jugador1, jugador2, jueces (rol).
   * Devuelve el channelId o null si Discord no está configurado.
   */
  async createMatchChannel(
    partidaId: string,
    jugador1DiscordId: string | null,
    jugador2DiscordId: string | null,
    torneoId: string,
  ): Promise<string | null> {
    if (!this.enabled) return null;

    const permissionOverwrites: object[] = [
      // @everyone denegado
      { id: this.guildId, type: 0, deny: '1024' },
    ];

    // Permitir a los jugadores si tienen Discord vinculado
    for (const discordId of [jugador1DiscordId, jugador2DiscordId]) {
      if (discordId) {
        permissionOverwrites.push({ id: discordId, type: 1, allow: '3072' }); // VIEW_CHANNEL + SEND_MESSAGES
      }
    }

    // Siempre permitir al rol de jueces
    if (this.juezRoleId) {
      permissionOverwrites.push({ id: this.juezRoleId, type: 0, allow: '3072' });
    }

    const body = {
      name: `partida-${partidaId.slice(-6)}`,
      type: 0, // GUILD_TEXT
      parent_id: this.categoryId,
      topic: `Partida ${partidaId} — Torneo ${torneoId}`,
      permission_overwrites: permissionOverwrites,
    };

    try {
      const res = await fetch(`${this.BASE}/guilds/${this.guildId}/channels`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Discord createChannel failed: ${err}`);
        return null;
      }

      const channel = await res.json() as { id: string };
      this.logger.log(`Discord channel created: ${channel.id} para partida ${partidaId}`);
      return channel.id;
    } catch (err) {
      this.logger.warn(`Discord createChannel error: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Archivar / eliminar canal al finalizar la partida ────────────────────

  async archiveChannel(channelId: string): Promise<void> {
    if (!this.enabled || !channelId) return;

    try {
      const res = await fetch(`${this.BASE}/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${this.token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Discord deleteChannel failed: ${err}`);
      } else {
        this.logger.log(`Discord channel ${channelId} archivado`);
      }
    } catch (err) {
      this.logger.warn(`Discord archiveChannel error: ${(err as Error).message}`);
    }
  }

  // ── DM al juez asignado ──────────────────────────────────────────────────

  async dmJuez(juezDiscordId: string, message: string): Promise<void> {
    if (!this.enabled || !juezDiscordId) return;

    try {
      // Crear DM channel
      const dmRes = await fetch(`${this.BASE}/users/@me/channels`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipient_id: juezDiscordId }),
      });

      if (!dmRes.ok) return;
      const dm = await dmRes.json() as { id: string };

      // Enviar mensaje
      await fetch(`${this.BASE}/channels/${dm.id}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message }),
      });

      this.logger.log(`DM enviado a juez ${juezDiscordId}`);
    } catch (err) {
      this.logger.warn(`Discord DM error: ${(err as Error).message}`);
    }
  }

  // ── Enviar mensaje a un canal ────────────────────────────────────────────

  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.enabled || !channelId) return;

    try {
      const res = await fetch(`${this.BASE}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.text();
        this.logger.warn(`Discord sendMessage failed: ${err}`);
      }
    } catch (err) {
      this.logger.warn(`Discord sendMessage error: ${(err as Error).message}`);
    }
  }
}
