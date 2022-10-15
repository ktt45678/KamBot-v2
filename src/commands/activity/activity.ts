import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, ComponentType, PermissionsBitField } from 'discord.js';
import { chunk } from 'lodash';

@ApplyOptions<Command.Options>({
  name: 'activity',
  aliases: [],
  description: 'Host an activity'
})
export class ActivityCommand extends Command {
  activityList = [
    {
      label: 'Youtube',
      description: 'Creates a YouTube activity invite',
      value: 'youtube',
      emoji: '<:youtube:892459181838323752>',
    },
    {
      label: 'Poker Night',
      description: 'Creates a Poker Night activity invite',
      value: 'poker',
      emoji: '🃏',
    },
    {
      label: 'Fishing',
      description: 'Creates a Fishington.io activity invite',
      value: 'fishing',
      emoji: '🐟',
    },
    {
      label: 'Betrayal',
      description: 'Creates a Betrayal.io activity invite',
      value: 'betrayal',
      emoji: '🗳️',
    },
    {
      label: 'Chess',
      description: 'Creates a Chess activity invite',
      value: 'chess',
      emoji: '♟️',
    },
    {
      label: 'Letter Tile',
      description: 'Creates a Letter Tile activity invite',
      value: 'lettertile',
      emoji: '🅿️',
    },
    {
      label: 'Word Snack',
      description: 'Creates a Word Snack activity invite',
      value: 'wordsnack',
      emoji: '🍜',
    },
    {
      label: 'Spellcast',
      description: 'Creates a Spellcast activity invite',
      value: 'spellcast',
      emoji: '🪄',
    },
    {
      label: 'Checkers',
      description: 'Creates a Checkers activity invite',
      value: 'checkers',
      emoji: '🏁',
    },
    {
      label: 'Puttparty',
      description: 'Creates a Puttparty activity invite',
      value: 'puttparty',
      emoji: '🃏',
    },
    {
      label: 'Sketchheads',
      description: 'Creates a Sketchheads activity invite',
      value: 'sketchheads',
      emoji: '🖌️',
    },
    {
      label: 'Ocho',
      description: 'Creates a Ocho activity invite',
      value: 'ocho',
      emoji: '🎴',
    },
    {
      label: 'Land',
      description: 'Creates a Land-io activity invite',
      value: 'land',
      emoji: '🐍',
    },
    {
      label: 'Meme',
      description: 'Creates a Meme activity invite',
      value: 'meme',
      emoji: '😂',
    },
    {
      label: 'Askaway',
      description: 'Creates a Askaway activity invite',
      value: 'askaway',
      emoji: '❓',
    },
    {
      label: 'Bobble',
      description: 'Creates a Bobble activity invite',
      value: 'bobble',
      emoji: '⚽',
    }
  ];

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Where to start the activity')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.CreateInstantInvite)
    );
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel');
    if (channel?.type !== ChannelType.GuildVoice) {
      return interaction.reply('The chosen channel must be a voice channel!');
    }

    const initialInteraction = await interaction.reply({
      content: 'Select an activity from below:',
      components: this.createActivityRows(),
      fetchReply: true
    });

    const selectInteraction = await initialInteraction.awaitMessageComponent({
      filter: m => m.user.id === interaction.user.id, time: 20000, componentType: ComponentType.Button,
    }).catch(error => (this.container.client.logger.error(error)));

    if (!selectInteraction) {
      return initialInteraction.edit({
        content: 'No activity selected',
        components: []
      });
    }

    for (let i = 0; i < this.activityList.length; i++) {
      if (this.activityList[i].value === selectInteraction.customId) {
        const invite = await this.container.discordTogether.createTogetherCode(channel.id, this.activityList[i].value)
        await selectInteraction.deferUpdate();
        return selectInteraction.editReply({
          content: `[Click here to join ${this.activityList[i].label}](${invite.code} 'Join ${this.activityList[i].label}')`,
          components: []
        });
      }
    };

    return selectInteraction.editReply({
      content: 'Something went wrong',
      components: []
    });
  }

  private createActivityRows() {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const activityChunks = chunk(this.activityList, 5);
    activityChunks.forEach(chunk => {
      const row = new ActionRowBuilder<ButtonBuilder>();
      chunk.forEach(activity => {
        row.addComponents(new ButtonBuilder()
          .setLabel(activity.label)
          .setCustomId(activity.value)
          .setEmoji(activity.emoji)
          .setStyle(ButtonStyle.Primary)
        );
      });
      rows.push(row);
    });
    return rows;
  }
}
