import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ActionRowBuilder, ApplicationCommandOptionChoiceData, AutocompleteInteraction, ButtonBuilder, ButtonStyle, CacheType, ChatInputCommandInteraction, ComponentType, EmbedBuilder, InteractionResponse, Message, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle, User } from 'discord.js';
import { FilterQuery } from 'mongoose';
import { DateTime } from 'luxon';

import { FGOAccCertificate, MyFGOLoginResult } from '../../common/interfaces/game';
import { myFGOService } from '../../services/myfgo';
import { CachePrefix, EmbedColors } from '../../common/enums';
import { MyFGOAccount, myFGOAccountModel } from '../../models';
import { DiscordEmbedError, comparePassword, escapeRegExp, generateErrorMessage, hashPassword } from '../../common/utils';
import { MYFGO_CRYPTO_SECRET_KEY } from '../../config';

interface HandleAccountLoginOptions {
  _id?: string;
  search?: string;
  sendLoginMessage?: () => Promise<Message>;
  deferReplyInteraction?: () => Promise<InteractionResponse<boolean>>;
  sendLoginPasswordModal: (modal: ModalBuilder) => Promise<ModalSubmitInteraction<CacheType> | null>;
}

@ApplyOptions<Subcommand.Options>({
  name: 'myfgo',
  fullCategory: ['Game'],
  description: 'Manage your Fate/Grand Order account',
  subcommands: [
    { name: 'register', messageRun: 'messageRunRegister', chatInputRun: 'chatInputRunRegister' },
    { name: 'login', messageRun: 'messageRunLogin', chatInputRun: 'chatInputRunLogin' },
    {
      name: 'autologin', type: 'group', entries: [
        { name: 'start', chatInputRun: 'chatInputAutoLoginStart' },
        { name: 'stop', chatInputRun: 'chatInputAutoLoginStop' }
      ]
    },
    /*
    {
      name: 'settings', type: 'group', entries: [
        { name: 'set', chatInputRun: 'chatInputSettingsSet' },
        { name: 'reset', chatInputRun: 'chatInputSettingsReset' }
      ]
    }
    */
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
            .setName('register')
            .setDescription('Link your FGO account')
        )
        .addSubcommand(command =>
          command
            .setName('login')
            .setDescription('Login to your FGO account')
            .addStringOption(option =>
              option
                .setName('account')
                .setDescription('Select your account')
                .setAutocomplete(true)
                .setRequired(true)
            )
        )
        .addSubcommandGroup(command =>
          command
            .setName('autologin')
            .setDescription('Auto login commands')
            .addSubcommand(command =>
              command
                .setName('start')
                .setDescription('Run scheduled login')
                .addStringOption(option =>
                  option
                    .setName('account')
                    .setDescription('Select your account')
                    .setAutocomplete(true)
                    .setRequired(true)
                )
                .addNumberOption(option =>
                  option
                    .setName('every')
                    .setDescription('Time delay until next login')
                    .setMinValue(60)
                    .setMaxValue(2592000)
                    .setChoices(
                      { name: '5 minutes', value: 300 },
                      { name: '10 minutes', value: 600 },
                      { name: '15 minutes', value: 900 },
                      { name: '30 minutes', value: 1800 },
                      { name: '1 hour', value: 3600 },
                      { name: '6 hours', value: 21600 },
                      { name: '12 hours', value: 43200 },
                      { name: '18 hours', value: 64800 },
                      { name: '1 day', value: 86400 }
                    )
                    .setRequired(true)
                )
            )
            .addSubcommand(command =>
              command
                .setName('stop')
                .setDescription('Stop scheduled login')
                .addStringOption(option =>
                  option
                    .setName('account')
                    .setDescription('Select your account')
                    .setAutocomplete(true)
                    .setRequired(true)
                )
                .addNumberOption(option =>
                  option
                    .setName('delay')
                    .setDescription('Stop auto-login after this period')
                    .setMinValue(300)
                    .setMaxValue(2592000)
                    .setChoices(
                      { name: '5 minutes', value: 300 },
                      { name: '10 minutes', value: 600 },
                      { name: '15 minutes', value: 900 },
                      { name: '30 minutes', value: 1800 },
                      { name: '1 hour', value: 3600 },
                      { name: '6 hours', value: 21600 },
                      { name: '12 hours', value: 43200 },
                      { name: '18 hours', value: 64800 },
                      { name: '1 day', value: 86400 },
                      { name: '3 days', value: 259200 },
                      { name: '5 days', value: 432000 },
                      { name: '7 days', value: 604800 }
                    )
                )
            )
        )
      /*
        .addSubcommandGroup(command =>
          command
            .setName('settings')
            .setDescription('Account settings')
            .addSubcommand(command =>
              command
                .setName('set')
                .setDescription('Change a setting')
                .addStringOption(option =>
                  option
                    .setName('name')
                    .setDescription('Setting name')
                    .setChoices({ name: 'Schedule login times', value: 'scheduleLoginTimes' })
                    .setRequired(true)
                )
            )
            .addSubcommand(command =>
              command
                .setName('reset')
                .setDescription('Reset a setting')
                .addStringOption(option =>
                  option
                    .setName('name')
                    .setDescription('Setting name')
                    .setChoices({ name: 'Schedule login times', value: 'scheduleLoginTimes' })
                    .setRequired(true)
                )
            )
        )
      */
    );
  }

  public async messageRunRegister(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    const registrationInfoEmbed = this.generateRegistrationInfoEmbed(message.author);
    const registrationActions = this.generateRegistrationActions();
    const registrationInfoMessage = await message.channel.send({ embeds: [registrationInfoEmbed], components: [registrationActions] });
    const selectedComponent = await registrationInfoMessage.awaitMessageComponent({
      filter: i => i.user.id === message.author.id,
      componentType: ComponentType.Button,
      time: 300_000
    }).catch(() => null);

    await registrationInfoMessage.edit({ components: [] });

    if (!selectedComponent || selectedComponent.customId !== 'register')
      return;
    const registrationModal = this.generateRegistrationModal();
    await selectedComponent.showModal(registrationModal);

    const modalSubmit = await selectedComponent.awaitModalSubmit({
      time: 300_000
    }).catch(() => null);

    if (!modalSubmit || modalSubmit.customId !== 'register')
      return;

    await modalSubmit.deferReply();
    const accountCertificateInput = modalSubmit.fields.getTextInputValue('accountCertificateInput');
    const displayNameInput = modalSubmit.fields.getTextInputValue('displayNameInput');
    const passwordInput = modalSubmit.fields.getTextInputValue('passwordInput');
    const account = await this.handleAccountRegistration(message.author, displayNameInput, accountCertificateInput, passwordInput);

    const embed = this.generateRegisterSuccess(message.author, account);
    return modalSubmit.followUp({ embeds: [embed] });
  }

  public async messageRunLogin(message: Message, args: Args) {
    // const cert = '';
    // const decryptedCert = myFGOService.decryptCertificate(cert);
    // const playerCert = <FGOAccCertificate>JSON.parse(decryptedCert);
    // const loginResult = await myFGOService.topLogin('na', playerCert);
    // const embed = this.generateLoginSuccess(message.author, loginResult);
    // return message.channel.send({ embeds: [embed] });
    if (!message.channel.isSendable()) return;
    return message.channel.send({ content: 'To be implemented, use slash command instead' });
  }

  public async chatInputRunRegister(interaction: ChatInputCommandInteraction) {
    const registrationModal = this.generateRegistrationModal();
    await interaction.showModal(registrationModal);

    const modalSubmit = await interaction.awaitModalSubmit({
      time: 300_000
    }).catch(() => null);

    if (!modalSubmit || modalSubmit.customId !== 'register')
      return;

    await modalSubmit.deferReply();
    const accountCertificateInput = modalSubmit.fields.getTextInputValue('accountCertificateInput');
    const displayNameInput = modalSubmit.fields.getTextInputValue('displayNameInput');
    const passwordInput = modalSubmit.fields.getTextInputValue('passwordInput');
    const account = await this.handleAccountRegistration(interaction.user, displayNameInput, accountCertificateInput, passwordInput);

    const embed = this.generateRegisterSuccess(interaction.user, account);
    return modalSubmit.followUp({ embeds: [embed] });
  }

  public async chatInputRunLogin(interaction: ChatInputCommandInteraction) {
    const accountId = interaction.options.getString('account', true);
    const embed = await this.handleAccountLogin(interaction.user, {
      _id: accountId,
      deferReplyInteraction: () => interaction.deferReply(),
      sendLoginPasswordModal: async (modal) => {
        await interaction.showModal(modal);
        return interaction.awaitModalSubmit({
          time: 300_000
        }).catch(() => null);
      }
    });
    if (!embed) {
      const errorEmbedMessage = generateErrorMessage('Failed to login, please try again later', 'Something went wrong');
      return interaction.followUp({ embeds: [errorEmbedMessage] });
    }
    return interaction.followUp({ embeds: [embed] });
  }

  async chatInputAutoLoginStart(interaction: ChatInputCommandInteraction) {
    const accountId = interaction.options.getString('account', true);
    const timeBetweenLogins = interaction.options.getNumber('every', true);
    await interaction.deferReply();
    const account = await myFGOAccountModel.findOne({ _id: accountId, ownerId: interaction.user.id }).exec();
    if (!account)
      throw new DiscordEmbedError('Account not found');
    // Check password login
    if (account.cryptType === 2) {
      const cacheKey = `${CachePrefix.MyFGOAccountDecryptedKeys}:${account._id}`;
      const decryptedKeys = await this.container.redisCache.get<{ authKey: string, secretKey: string }>(cacheKey);
      if (!decryptedKeys) {
        throw new DiscordEmbedError('A password for this account is required, please login manually first');
      }
      await this.container.redisCache.set(cacheKey, decryptedKeys, 604_800);
    }
    account.settings.autoLogin = true;
    account.settings.autoLoginInterval = timeBetweenLogins;
    await account.save();
    const embed = this.generateAutoLoginStartSuccess(interaction.user, account);
    return interaction.followUp({ embeds: [embed] });
  }

  async chatInputAutoLoginStop(interaction: ChatInputCommandInteraction) {
    const accountId = interaction.options.getString('account', true);
    const timeDelay = interaction.options.getNumber('delay', false);
    await interaction.deferReply();
    const account = await myFGOAccountModel.findOne({ _id: accountId, ownerId: interaction.user.id }).exec();
    if (!account)
      throw new DiscordEmbedError('Account not found');
    if (!timeDelay) {
      account.settings.autoLogin = false;
      account.settings.autoLoginInterval = null;
    } else {
      account.settings.autoLoginExpiry = DateTime.now().plus({ seconds: timeDelay }).toJSDate();
    }
    await account.save();
    const embed = this.generateAutoLoginStopSuccess(interaction.user, account);
    return interaction.followUp({ embeds: [embed] });
  }

  chatInputSettingsSet(interaction: ChatInputCommandInteraction) {

  }

  chatInputSettingsReset(interaction: ChatInputCommandInteraction) {

  }

  public override async autocompleteRun(interaction: AutocompleteInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();
    let choices: ApplicationCommandOptionChoiceData<string | number>[] = [];
    if (subcommand === 'login') {
      choices = await this.findAutoCompleteLoginResult(interaction);
    } else if (subcommandGroup === 'autologin') {
      if (subcommand === 'start' || subcommand === 'stop') {
        choices = await this.findAutoCompleteLoginResult(interaction);
      }
    }
    return interaction.respond(choices);
  }

  private async findAutoCompleteLoginResult(interaction: AutocompleteInteraction) {
    const accounts = await myFGOAccountModel.find({ ownerId: interaction.user.id }, { _id: 1, displayName: 1, region: 1 })
      .lean().exec();
    const choices: ApplicationCommandOptionChoiceData<string | number>[] = accounts.map(a =>
      ({ name: `[${a.region.toUpperCase()}] ${a.displayName}`, value: a._id.toString() })
    );
    return choices;
  }

  private async handleAccountRegistration(user: User, displayName: string, cert: string, password: string | null = null) {
    // Decrypt player cert
    const decryptedCertString = myFGOService.decryptCertificate(cert);
    const playerCert = <FGOAccCertificate>JSON.parse(decryptedCertString);
    // Create account data
    const region = myFGOService.getUserGameRegion(playerCert.userCreateServer);
    if (!region)
      throw new DiscordEmbedError('Could not detect the account\'s region', 'Error when registering account');
    const cryptKey = myFGOService.generateAccountCryptoKey(password);
    const secondCryptKey = myFGOService.generateAccountCryptoKey(MYFGO_CRYPTO_SECRET_KEY);
    const encryptedAuthKey = myFGOService.encryptUserKey(playerCert.authKey, [cryptKey, secondCryptKey]);
    const encryptedSecretKey = myFGOService.encryptUserKey(playerCert.secretKey, [cryptKey, secondCryptKey]);
    const cryptType = !password ? 1 : 2;
    const cryptUserPassword = password && await hashPassword(password);
    const account = new myFGOAccountModel({
      ownerId: user.id, accUserId: playerCert.userId, displayName, region,
      authKey: encryptedAuthKey, secretKey: encryptedSecretKey, cryptType, cryptUserPassword
    });
    await account.save();
    return account;
  }

  private async handleAccountLogin(user: User, options: HandleAccountLoginOptions) {
    if (!options._id) {
      const filters: FilterQuery<MyFGOAccount> = { ownerId: user.id };
      if (options.search)
        filters.displayName = { $regex: `^${escapeRegExp(options.search)}`, $options: 'i' };
      const accounts = await myFGOAccountModel.find(filters).lean().exec();
      // TODO: Later
    }
    const account = await myFGOAccountModel.findOne({ _id: options._id, ownerId: user.id }).exec();
    if (!account)
      throw new DiscordEmbedError('Account not found');
    const plainAccount = account.toObject();
    const cacheKey = `${CachePrefix.MyFGOAccountDecryptedKeys}:${account._id}`;
    let decryptedAuthKey: string | null = null;
    let decryptedSecretKey: string | null = null;
    const decryptedKeys = await this.container.redisCache.get<{ authKey: string, secretKey: string }>(cacheKey);
    if (decryptedKeys) {
      plainAccount.authKey = decryptedKeys.authKey;
      plainAccount.secretKey = decryptedKeys.secretKey;
      await this.container.redisCache.set(cacheKey, decryptedKeys, 604_800);
      if (options.deferReplyInteraction) {
        // Defer reply if loading keys from cache
        await options.deferReplyInteraction();
      }
    } else {
      let userPassword: string | null = null;
      if (account.cryptType === 2) {
        const loginPasswordModal = this.generateLoginPasswordModal();
        const passwordModalSubmit = await options.sendLoginPasswordModal(loginPasswordModal);
        if (!passwordModalSubmit) return null;
        await passwordModalSubmit.deferReply();
        const passwordInput = passwordModalSubmit.fields.getTextInputValue('passwordInput');
        const isValidPassword = await comparePassword(passwordInput, account.cryptUserPassword);
        if (!isValidPassword)
          throw new DiscordEmbedError('Incorrect password, please try again');
        userPassword = passwordInput;
      } else if (options.deferReplyInteraction) {
        // Defer reply if the modal won't show up
        await options.deferReplyInteraction();
      }
      const cryptKey = myFGOService.generateAccountCryptoKey(MYFGO_CRYPTO_SECRET_KEY);
      const secondCryptKey = myFGOService.generateAccountCryptoKey(userPassword);
      decryptedAuthKey = myFGOService.decryptUserKey(plainAccount.authKey, [cryptKey, secondCryptKey]);
      decryptedSecretKey = myFGOService.decryptUserKey(plainAccount.secretKey, [cryptKey, secondCryptKey]);
      if (!decryptedAuthKey || !decryptedSecretKey)
        throw new DiscordEmbedError('Failed to decrypt user certificate');
      plainAccount.authKey = decryptedAuthKey;
      plainAccount.secretKey = decryptedSecretKey;
      await this.container.redisCache.set(cacheKey, { authKey: decryptedAuthKey, secretKey: decryptedSecretKey }, 604_800);
    }
    const loginResult = await myFGOService.topLogin(plainAccount);
    // try {
    //   await myFGOService.profileData(plainAccount);
    // } catch (e) {
    //   console.log(e);
    // }
    account.lastLogin = new Date();
    await account.save();
    const embed = this.generateLoginSuccess(user, loginResult, account.region);
    return embed;
  }

  private generateRegistrationInfoEmbed(user: User) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle('Link your FGO account')
      .setDescription(`Follow these steps to link your FGO account\n
1. Provide your account certificate
  - On an Android device, use a **File Explorer** software
  - Access **sdcard/Android/data/com.aniplex.fategrandorder/files/data (for JP)**, or **sdcard/Android/data/com.aniplex.fategrandorder.en/files/data (for NA)**
  - Open the file **54cc790bf952ea710ed7e8be08049531** and copy all the contents, this will be your account certificate
  - Use it only for the linking process, **do not share it to anyone else**

2. Enter a display name for the account
  - Choose a name for easy access later, it doesn't have to be the same as the in-game name

3. Optional password
  - By default, your account is stored safely on the server, you can **provide your own password to increase the security**
  - You will be asked to enter your password each time running a command, so **make sure you remember it**
  - This password is optional. If not set, your account is still protected by the default encryption level
      `)
      .setFooter({ text: 'Your information will only be used to access Fate/Grand Order using this bot\'s features.' });
  }

  private generateRegistrationActions() {
    const registerButton = new ButtonBuilder()
      .setCustomId('register')
      .setLabel('Accept and start linking account')
      .setStyle(ButtonStyle.Primary);
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(registerButton);
  }

  private generateRegistrationModal() {
    const modal = new ModalBuilder()
      .setCustomId('register')
      .setTitle('Link a FGO account');

    const accountCertificateInput = new TextInputBuilder()
      .setCustomId('accountCertificateInput')
      .setLabel('Account certificate')
      .setRequired(true)
      .setMaxLength(1000)
      .setPlaceholder('Content of the file 54cc790bf952ea710ed7e8be08049531 inside FGO data folder')
      .setRequired(true)
      .setStyle(TextInputStyle.Paragraph);

    const displayNameInput = new TextInputBuilder()
      .setCustomId('displayNameInput')
      .setLabel('Display name')
      .setMaxLength(100)
      .setMinLength(1)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const passwordInput = new TextInputBuilder()
      .setCustomId('passwordInput')
      .setLabel('Password (optional)')
      .setMaxLength(100)
      .setRequired(false)
      .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(accountCertificateInput);
    const secondActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(displayNameInput);
    const thirdActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(passwordInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
    return modal;
  }

  private generateLoginPasswordModal() {
    const modal = new ModalBuilder()
      .setCustomId('login')
      .setTitle('Login to your FGO account');

    const passwordInput = new TextInputBuilder()
      .setCustomId('passwordInput')
      .setLabel('Password to unlock your FGO account')
      .setMaxLength(100)
      .setRequired(false)
      .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(passwordInput);

    modal.addComponents(firstActionRow);
    return modal;
  }

  private generateRegisterSuccess(user: User, account: MyFGOAccount) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle(`Fate/Grand Order [${account.region.toUpperCase()}]`)
      .setDescription('Account has been successfully registered')
      .addFields(
        { name: 'ID', value: account._id.toString(), inline: false },
        { name: 'Display name', value: account.displayName, inline: false },
        { name: 'Region', value: account.region.toUpperCase(), inline: false }
      )
      .setFooter({ text: 'Use login command to log in to this account' });
  }

  private generateLoginSuccess(user: User, loginResult: MyFGOLoginResult, region: string) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle(`Fate/Grand Order [${region.toUpperCase()}]`)
      .setDescription('Successfully logged in to FGO server')
      .addFields(
        { name: 'Level', value: loginResult.level.toString(), inline: true },
        { name: 'Tickets', value: loginResult.ticket.toString(), inline: true },
        { name: 'Saint Quartz', value: loginResult.saintQuartz.toString(), inline: true },
        { name: 'Login Days', value: loginResult.loginDays.toString(), inline: true },
        { name: 'Total Days', value: loginResult.totalDays.toString(), inline: true },
        { name: 'Total Friend Points', value: loginResult.totalFriendPoint.toString(), inline: true },
        { name: 'Friend Points', value: `+${loginResult.receivedFriendPoint}`, inline: true },
        { name: 'AP', value: `${loginResult.currentAp}/${loginResult.apMax}`, inline: true }
      )
      .setThumbnail('https://grandorder.wiki/images/thumb/3/3d/Icon_Item_Saint_Quartz.png/200px-Icon_Item_Saint_Quartz.png');
  }

  private generateAutoLoginStartSuccess(user: User, account: MyFGOAccount) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle(`Fate/Grand Order [${account.region.toUpperCase()}]`)
      .setDescription('Scheduled login has been enabled for this account')
      .addFields(
        { name: 'ID', value: account._id.toString(), inline: false },
        { name: 'Display name', value: account.displayName, inline: false },
        { name: 'Region', value: account.region.toUpperCase(), inline: false }
      );
  }

  private generateAutoLoginStopSuccess(user: User, account: MyFGOAccount) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setTitle(`Fate/Grand Order [${account.region.toUpperCase()}]`)
      .setDescription('Scheduled login has been disabled for this account')
      .addFields(
        { name: 'ID', value: account._id.toString(), inline: false },
        { name: 'Display name', value: account.displayName, inline: false },
        { name: 'Region', value: account.region.toUpperCase(), inline: false }
      );
  }
}
