import React from "react";
import { Episode, EpisodeType } from "./episodes";
import { PregameScreen } from "../pregameScreen/pregameScreen";
import { GameState } from "../../model/gameState";

const PregameEpisodeType: EpisodeType = {
    canPlayWith: (n: number, finalists: number) => n > finalists - 1,
    eliminates: 0,
    emoji: "",
    hideViewsBar: true,
    name: "Pregame",
    description: "",
    generate: (gameState: GameState) => new PregameEpisode(gameState),
};

export class PregameEpisode extends Episode {
    readonly title = "Pregame";
    readonly scenes = [];
    readonly content: JSX.Element;
    readonly gameState: GameState;
    readonly type = PregameEpisodeType;

    public constructor(gameState: GameState) {
        super({
            title: "Pregame",
            scenes: [],
            content: <PregameScreen cast={gameState.houseguests} />,
            gameState,
            type: PregameEpisodeType,
        });
        this.gameState = gameState;
        this.content = <PregameScreen cast={gameState.houseguests} />;
    }
}
