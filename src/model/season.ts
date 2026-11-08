import { BigBrotherVanilla } from "../components/episode/bigBrotherEpisode";
import { GameState } from "./gameState";
import { Episode, EpisodeType, nextEpisode } from ".";
import { BigBrotherFinale } from "../components/episode/bigBrotherFinale";
import { GameOver } from "../components/episode/gameOver";

export interface EpisodeLibrary {
    [id: number]: EpisodeType;
}

export class Season {
    private episodeLibrary: EpisodeLibrary = {};

    public constructor(episodeLibrary?: EpisodeLibrary) {
        if (episodeLibrary) this.episodeLibrary = episodeLibrary;
    }

    public renderEpisode(gameState: GameState): Episode {
        return nextEpisode(gameState, this.whichEpisodeType(gameState));
    }

    public whichEpisodeType(gameState: GameState) {
        const players = gameState.remainingPlayers
        if (players === gameState.finalFinalistsSize()) {
            return BigBrotherFinale;
        }
        if (players === gameState.finalFinalistsSize() - 1) {
            return GameOver;
        }
        if (this.episodeLibrary[players]) {
            return this.episodeLibrary[players];
        }
        return BigBrotherVanilla;
    }
}
