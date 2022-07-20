import { ReaderClient } from "../../Client";

export function readyEvent(client: ReaderClient) {
    if (client.ready) {
        client.logger.info({ message: `${client.user.username}#${client.user.discriminator} Is Online`, subTitle: "ReaderFramework::Events::Ready", title: "GATEWAY" });
    }
}
