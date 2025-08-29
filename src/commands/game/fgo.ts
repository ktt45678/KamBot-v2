import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { APIEmbedField, ActionRowBuilder, AttachmentBuilder, AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, Message, User } from 'discord.js';

import { FGOCraftEssence, FGOServant, fgoCraftEssenceModel, fgoServantModel, profileModel } from '../../models';
import { fgoService } from '../../services/fgo';
import { capitalizeFirstLetter, createSendTypingInterval, escapeRegExp, generateErrorMessage } from '../../common/utils';
import { EmbedColors } from '../../common/enums';
import { IMAGEKIT_URL } from '../../config';

@ApplyOptions<Subcommand.Options>({
  name: 'fgo',
  aliases: ['fgacha'],
  fullCategory: ['Game'],
  description: 'Plays Fate/Grand Order gacha simulator',
  subcommands: [
    { name: 'summon', messageRun: 'messageRunSummon', chatInputRun: 'chatInputRunSummon', default: true },
    {
      name: 'rateup', type: 'group', entries: [
        { name: 'add', chatInputRun: 'chatInputRateUpAdd' },
        { name: 'remove', chatInputRun: 'chatInputRateUpRemove' },
        { name: 'clear', chatInputRun: 'chatInputRateUpClear' }
      ]
    },
  ]
})
export class FGOCommand extends Subcommand {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(command =>
          command
            .setName('summon')
            .setDescription('Perform summon')
            .addStringOption(option =>
              option
                .setName('type')
                .setDescription('Summoning type')
                .setChoices({ name: 'Single', value: 'single' }, { name: 'Multi', value: 'multi' })
            )
        )
        .addSubcommandGroup(group =>
          group
            .setName('rateup')
            .setDescription('Edit rate-up settings')
            .addSubcommand(command =>
              command
                .setName('add')
                .setDescription('Add a rate-up servant or craft essence')
                .addStringOption(option =>
                  option
                    .setName('type')
                    .setDescription('Add a servant or craft essence')
                    .setChoices({ name: 'Servant', value: 'servant' }, { name: 'Craft essence', value: 'ce' })
                    .setRequired(true)
                )
                .addStringOption(option =>
                  option
                    .setName('name')
                    .setDescription('Servant or craft essence')
                    .setAutocomplete(true)
                    .setRequired(true)
                )
            )
            .addSubcommand(command =>
              command
                .setName('remove')
                .setDescription('Remove a rate-up servant or craft essence')
                .addStringOption(option =>
                  option
                    .setName('type')
                    .setDescription('Remove a servant or craft essence')
                    .setChoices({ name: 'Servant', value: 'servant' }, { name: 'Craft essence', value: 'ce' })
                    .setRequired(true)
                )
                .addStringOption(option =>
                  option
                    .setName('name')
                    .setDescription('Servant or craft essence')
                    .setAutocomplete(true)
                    .setRequired(true)
                )
            )
            .addSubcommand(command =>
              command
                .setName('clear')
                .setDescription('Clear all rate-up servants and craft essences')
            )
        )
    );
  }

  public async messageRunSummon(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    let type: string = 'multi';
    const profile = await profileModel.findOne({ _id: message.author.id }, { rateUpServants: 1, rateUpCEs: 1 })
      .populate([{ path: 'rateUpServants' }, { path: 'rateUpCEs' }])
      .lean().exec();
    const rateUpServants = <FGOServant[] | undefined><unknown>profile?.rateUpServants;
    const rateUpCEs = <FGOCraftEssence[] | undefined><unknown>profile?.rateUpCEs;
    if (!args.finished) {
      type = await args.pick('string').catch(() => 'multi');
      if (!['single', 'multi', '1', '11'].includes(type)) {
        const errorEmbedMessage = generateErrorMessage('Value must be single, multi, 1 or 11');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
    }
    const sendTypingInterval = await createSendTypingInterval(message.channel);
    let summonedData: (FGOCraftEssence | FGOServant | null) | (FGOCraftEssence | FGOServant | null)[];
    try {
      const summonInfo = await fgoService.buildSummonInfo(rateUpServants, rateUpCEs);
      if (['single', '1'].includes(type)) {
        summonedData = await fgoService.singleSummon(summonInfo);
      } else {
        summonedData = await fgoService.multiSummon(summonInfo);
      }
    } finally {
      clearInterval(sendTypingInterval);
    }
    const attachment = await this.generateSummonInfo(summonedData);
    const summonInfoActions = this.generateSummonInfoActions();
    const summonInfoMessage = await message.channel.send({ files: [attachment], components: [summonInfoActions] });
    const selectedComponent = await summonInfoMessage.awaitMessageComponent({
      filter: i => i.user.id === message.author.id,
      componentType: ComponentType.Button,
      time: 30_000
    }).catch(() => null);
    if (selectedComponent && selectedComponent.customId === 'details') {
      const summonDetailsEmbed = this.generateSummonDetails(message.author, summonedData);
      await Promise.all([
        selectedComponent.deferUpdate(),
        message.channel.send({ embeds: [summonDetailsEmbed] })
      ]);
    }
    await summonInfoMessage.edit({ components: [] });
  }

  public async chatInputRunSummon(interaction: ChatInputCommandInteraction) {
    const type: string = interaction.options.getString('type') || 'multi';
    await interaction.deferReply();
    const profile = await profileModel.findOne({ _id: interaction.user.id }, { rateUpServants: 1, rateUpCEs: 1 })
      .populate([{ path: 'rateUpServants' }, { path: 'rateUpCEs' }])
      .lean().exec();
    const rateUpServants = <FGOServant[] | undefined><unknown>profile?.rateUpServants;
    const rateUpCEs = <FGOCraftEssence[] | undefined><unknown>profile?.rateUpCEs;
    const summonInfo = await fgoService.buildSummonInfo(rateUpServants, rateUpCEs);
    let summonedData: (FGOCraftEssence | FGOServant | null) | (FGOCraftEssence | FGOServant | null)[];
    if (type === 'single') {
      summonedData = await fgoService.singleSummon(summonInfo);
    } else {
      summonedData = await fgoService.multiSummon(summonInfo);
    }
    const attachment = await this.generateSummonInfo(summonedData);
    const summonInfoActions = this.generateSummonInfoActions();
    const summonInfoMessage = await interaction.followUp({ files: [attachment], components: [summonInfoActions] });
    const selectedComponent = await summonInfoMessage.awaitMessageComponent({
      filter: i => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 30_000
    }).catch(() => null);
    if (selectedComponent && selectedComponent.customId === 'details') {
      const summonDetailsEmbed = this.generateSummonDetails(interaction.user, summonedData);
      await Promise.all([
        selectedComponent.deferUpdate(),
        interaction.followUp({ embeds: [summonDetailsEmbed] })
      ]);
    }
    await summonInfoMessage.edit({ components: [] });
  }

  public async chatInputRateUpAdd(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type', true);
    const id = +interaction.options.getString('name', true);
    if (type === 'servant') {
      const servant = await fgoService.findOneServant(id);
      if (!servant) {
        const errorEmbedMessage = generateErrorMessage('Servant not found', 'Something went wrong');
        return interaction.reply({ embeds: [errorEmbedMessage], ephemeral: true });
      };
      await profileModel.updateOne({ _id: interaction.user.id }, { $addToSet: { rateUpServants: servant._id } }, { upsert: true })
        .exec();
      const embed = this.generateRateUpAdded(interaction.user, servant);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (type === 'ce') {
      const ce = await fgoService.findOneCraftEssence(id);
      if (!ce) {
        const errorEmbedMessage = generateErrorMessage('Craft essence not found', 'Something went wrong');
        return interaction.reply({ embeds: [errorEmbedMessage], ephemeral: true });
      };
      await profileModel.updateOne({ _id: interaction.user.id }, { $addToSet: { rateUpCEs: ce._id } }, { upsert: true }).exec();
      const embed = this.generateRateUpAdded(interaction.user, ce);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  public async chatInputRateUpRemove(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type', true);
    const id = +interaction.options.getString('name', true);
    if (type === 'servant') {
      const servant = await fgoService.findOneServant(id);
      if (!servant) {
        const errorEmbedMessage = generateErrorMessage('Servant not found', 'Something went wrong');
        return interaction.reply({ embeds: [errorEmbedMessage], ephemeral: true });
      };
      await profileModel.updateOne({ _id: interaction.user.id }, { $pull: { rateUpServants: servant._id } }, { upsert: true }).exec();
      const embed = this.generateRateUpRemoved(interaction.user, servant);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } else if (type === 'ce') {
      const ce = await fgoService.findOneCraftEssence(id);
      if (!ce) {
        const errorEmbedMessage = generateErrorMessage('Craft essence not found', 'Something went wrong');
        return interaction.reply({ embeds: [errorEmbedMessage], ephemeral: true });
      };
      await profileModel.updateOne({ _id: interaction.user.id }, { $pull: { rateUpCEs: ce._id } }, { upsert: true }).exec();
      const embed = this.generateRateUpRemoved(interaction.user, ce);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  public async chatInputRateUpClear(interaction: ChatInputCommandInteraction) {
    await profileModel
      .updateOne({ _id: interaction.user.id }, { $set: { rateUpServants: [], rateUpCEs: [] } }, { upsert: true })
      .lean().exec();
    const embed = this.generateRateUpCleared(interaction.user);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    if (subcommandGroup === 'rateup') {
      const type = interaction.options.getString('type') || 'servant';
      const query = interaction.options.getFocused(true);
      const queryName = escapeRegExp(query.value);
      if (subcommand === 'add') {
        if (type === 'servant') {
          const servants = await fgoServantModel.find({ name: { $regex: queryName, $options: 'i' } }).limit(10).lean().exec();
          return interaction.respond(servants.map(servant =>
            ({ name: `${servant.name} • ${capitalizeFirstLetter(servant.className)}`, value: servant._id.toString() }))
          );
        } else if (type === 'ce') {
          const craftEssences = await fgoCraftEssenceModel.find({ name: { $regex: queryName, $options: 'i' } }).limit(10).lean().exec();
          return interaction.respond(craftEssences.map(ce =>
            ({ name: ce.name, value: ce._id.toString() }))
          );
        }
      } else if (subcommand === 'remove') {
        if (type === 'servant') {
          const addedServantIds = await profileModel.findOne({ _id: interaction.user.id }, { rateUpServants: 1 }).lean().exec()
            .then(profile => profile?.rateUpServants || []);
          const servants = await fgoServantModel.find({ _id: { $in: addedServantIds }, name: { $regex: queryName, $options: 'i' } })
            .limit(10).lean().exec();
          return interaction.respond(servants.map(servant =>
            ({ name: `${servant.name} • ${capitalizeFirstLetter(servant.className)}`, value: servant._id.toString() }))
          );
        } else if (type === 'ce') {
          const addedCEIds = await profileModel.findOne({ _id: interaction.user.id }, { rateUpCEs: 1 }).lean().exec()
            .then(profile => profile?.rateUpCEs || []);
          const craftEssences = await fgoCraftEssenceModel.find({ _id: { $in: addedCEIds }, name: { $regex: queryName, $options: 'i' } })
            .limit(10).lean().exec();
          return interaction.respond(craftEssences.map(ce =>
            ({ name: ce.name, value: ce._id.toString() }))
          );
        }
      }
    }
    return interaction.respond([]);
  }

  private async generateSummonInfo(summonedData: (FGOCraftEssence | FGOServant | null) | (FGOCraftEssence | FGOServant | null)[]) {
    let attachment: AttachmentBuilder;
    if (!Array.isArray(summonedData)) {
      const image = await fgoService.createImage(summonedData);
      const summonResultImageData = await fgoService.createSummonResultImage([image]);
      attachment = new AttachmentBuilder(summonResultImageData, { name: 'fgo_summon.jpg' });
    } else {
      const images = await Promise.all(summonedData.map(data => fgoService.createImage(data)));
      const summonResultImageData = await fgoService.createSummonResultImage(images);
      attachment = new AttachmentBuilder(summonResultImageData, { name: 'fgo_summon.jpg' });
    }
    return attachment;
  }

  private generateSummonInfoActions() {
    const detailsButton = new ButtonBuilder()
      .setCustomId('details')
      .setLabel('Details')
      .setStyle(ButtonStyle.Secondary);
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(detailsButton);
  }

  private generateSummonDetails(user: User, summonedData: (FGOCraftEssence | FGOServant | null) | (FGOCraftEssence | FGOServant | null)[]) {
    const fields: APIEmbedField[] = [];
    if (!Array.isArray(summonedData)) {
      let fieldName = summonedData && 'classId' in summonedData ? capitalizeFirstLetter(summonedData.className) : 'Craft essence';
      summonedData && (fieldName += ` • ${summonedData.rarity} <:rarity1_0:1133822292087017493>`);
      fields.push({ name: fieldName, value: summonedData?.name || 'No data' });
    } else {
      summonedData.forEach(data => {
        let fieldName = data && 'classId' in data ? capitalizeFirstLetter(data.className) : 'Craft essence';
        data && (fieldName += ` • ${data.rarity} <:rarity1_0:1133822292087017493>`);
        fields.push({ name: fieldName, value: data?.name || 'No data', inline: true });
      });
    }
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle('Summon results')
      .setFields(fields);
  }

  private generateRateUpAdded(user: User, servantOrCE: FGOServant | FGOCraftEssence) {
    const content = 'classId' in servantOrCE ?
      `${servantOrCE.name} • ${capitalizeFirstLetter(servantOrCE.className)}` :
      servantOrCE.name;
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle('Added to rate-up banner')
      .setDescription(content)
      .setThumbnail(`${IMAGEKIT_URL}/${servantOrCE.facePath}`);
  }

  private generateRateUpRemoved(user: User, servantOrCE: FGOServant | FGOCraftEssence) {
    const content = 'classId' in servantOrCE ?
      `${servantOrCE.name} • ${capitalizeFirstLetter(servantOrCE.className)}` :
      servantOrCE.name;
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle('Removed from rate-up banner')
      .setDescription(content)
      .setThumbnail(`${IMAGEKIT_URL}/${servantOrCE.facePath}`);
  }

  private generateRateUpCleared(user: User) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle('Banner cleared')
      .setDescription('Removed all rate-up servants and craft essences')
  }
}
