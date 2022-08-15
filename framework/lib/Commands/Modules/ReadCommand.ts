import { NReaderClient } from "../../Client";
import { ActionRow, CommandInteraction, Constants, TextableChannel } from "eris";
import { GuildModel } from "../../Models";
import { createReadPaginator } from "../../Modules/ReadPaginator";
import { Utils } from "givies-framework";
import { setTimeout } from "node:timers/promises";

export async function readCommand(client: NReaderClient, interaction: CommandInteraction<TextableChannel>) {
    const args: { id?: number } = {};

    for (const option of interaction.data.options) {
        args[option.name] = (option as any).value as string;
    }

    await interaction.defer();
    await setTimeout(2000);

    client.api.getBook(args.id).then(async (book) => {
        const guildData = await GuildModel.findOne({ id: interaction.guildID });
        const artistTags: string[] = book.tags.filter((tag) => tag.url.startsWith("/artist")).map((tag) => tag.name);
        const characterTags: string[] = book.tags.filter((tag) => tag.url.startsWith("/character")).map((tag) => tag.name);
        const contentTags: string[] = book.tags.filter((tag) => tag.url.startsWith("/tag")).map((tag) => `${tag.name} (${tag.count.toLocaleString()})`);
        const languageTags: string[] = book.tags.filter((tag) => tag.url.startsWith("/language")).map((tag) => tag.name.charAt(0).toUpperCase() + tag.name.slice(1));
        const parodyTags: string[] = book.tags.filter((tag) => tag.url.startsWith("/parody")).map((tag) => tag.name);
        const uploadedAt = `<t:${book.uploaded.getTime() / 1000}:F>`;
        const tags = book.tags.filter((tag) => tag.url.startsWith("/tag")).map((tag) => tag.name);

        if (Utils.Util.findCommonElement(tags, client.config.API.RESTRICTED_TAGS) && !guildData.settings.whitelisted) {
            const embed = new Utils.RichEmbed()
                .setColor(client.config.BOT.COLOUR)
                .setDescription(client.translate("main.tags.restricted", { channel: "[#info](https://discord.com/channels/763678230976659466/1005030227174490214)", server: "https://discord.gg/b7AW2Zkcsw" }));

            return interaction.createMessage({
                embeds: [embed],
                flags: Constants.MessageFlags.EPHEMERAL
            });
        }

        const embed = new Utils.RichEmbed()
            .setAuthor(book.id.toString(), `https://nhentai.net/g/${book.id.toString()}`)
            .setColor(client.config.BOT.COLOUR)
            .addField(client.translate("main.title"), `\`${book.title.pretty}\``)
            .addField(client.translate("main.pages"), `\`${book.pages.length}\``)
            .addField(client.translate("main.released"), uploadedAt)
            .addField(languageTags.length > 1 ? client.translate("main.languages") : client.translate("main.language"), `\`${languageTags.length !== 0 ? languageTags.join("`, `") : client.translate("main.none")}\``)
            .addField(artistTags.length > 1 ? client.translate("main.artists") : client.translate("main.artist"), `\`${artistTags.length !== 0 ? artistTags.join("`, `") : client.translate("main.none")}\``)
            .addField(characterTags.length > 1 ? client.translate("main.characters") : client.translate("main.character"), `\`${characterTags.length !== 0 ? characterTags.join("`, `") : client.translate("main.original")}\``)
            .addField(parodyTags.length > 1 ? client.translate("main.parodies") : client.translate("main.parody"), `\`${parodyTags.length !== 0 ? parodyTags.join("`, `").replace("original", `${client.translate("main.original")}`) : client.translate("main.none")}\``)
            .addField(contentTags.length > 1 ? client.translate("main.tags") : client.translate("main.tag"), `\`${contentTags.length !== 0 ? contentTags.join("`, `") : client.translate("main.none")}\``)
            .setFooter(`⭐ ${book.favorites.toLocaleString()}`)
            .setThumbnail(client.api.getImageURL(book.cover));

        const component: ActionRow = {
            components: [
                {
                    custom_id: `read_${interaction.id}`,
                    label: client.translate("main.read"),
                    style: 1,
                    type: 2
                },
                {
                    custom_id: `stop_${interaction.id}`,
                    label: client.translate("main.stop"),
                    style: 4,
                    type: 2
                },
                {
                    custom_id: `bookmark_${interaction.id}`,
                    label: client.translate("main.bookmark"),
                    style: 2,
                    type: 2
                },
                {
                    custom_id: `show_cover_${interaction.id}`,
                    label: client.translate("main.cover.show"),
                    style: 1,
                    type: 2
                }
            ],
            type: 1
        };

        interaction.createMessage({ components: [component], embeds: [embed] });
        createReadPaginator(client, book, interaction);
    }).catch((err: Error) => {
        if (err.message === "Request failed with status code 404") {
            const embed = new Utils.RichEmbed()
                .setColor(client.config.BOT.COLOUR)
                .setDescription(client.translate("main.read.none", { id: args.id }));

            return interaction.createMessage({
                embeds: [embed],
            });
        } else {
            const embed = new Utils.RichEmbed()
                .setColor(client.config.BOT.COLOUR)
                .setDescription(client.translate("main.error"));

            interaction.createMessage({
                embeds: [embed],
            });
        }

        return client.logger.error({ message: err.message, subTitle: "NHentaiAPI::Book", title: "API" });
    });
}
