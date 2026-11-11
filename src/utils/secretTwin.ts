import { PlayerProfile } from "../model";
import { toggleIntruder } from "./intruder";

export interface SecretTwin {
    isTwin: boolean;
    isPrimaryTwin: boolean;
    twinPartner: number | null;
    twinEntryEpisode: number | null;
    twinEntryCancelled: boolean;
}

export function toggleSecretTwin(player: PlayerProfile, checked: boolean): PlayerProfile {
    const updatedTwin = { 
        ...player.secretTwin,
        isTwin: checked,
        isPrimaryTwin: false 
    };

    let updatedPlayer: PlayerProfile = {
        ...player,
        secretTwin: updatedTwin
    };
    
    if (!checked) {
        updatedTwin.twinPartner = null; updatedTwin.twinEntryEpisode = null;
    } else {
        if (player.intruder.isIntruder) {
            updatedPlayer = toggleIntruder(updatedPlayer, false);
        }
        if (!updatedTwin.twinEntryEpisode) updatedTwin.twinEntryEpisode = 5;
        if (updatedTwin.twinPartner === null) updatedTwin.twinPartner = -1;
    }
    return updatedPlayer;
}