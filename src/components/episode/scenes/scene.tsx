import React from "react";
import { GameState } from "../../../model/gameState";
import { ViewsBar } from "../../viewsBar/viewBar";
import { CenteredBold } from "../../layout/centered";
import { randomArrayIndex } from "../../../utils";
import { getEventBackgroundImage } from "../utilities/houseLocations";
import { HouseEventBox } from "../../layout/box";
import { BottomBar } from "../../bottomBar/bottomBar";
import { HouseEvent } from "../utilities/houseEvents";
interface InitScene {
    readonly title: string;
    readonly gameState: GameState;
    readonly content: JSX.Element;
}

export const houseEventBox = (event: HouseEvent) => {
    if (!event) return null;
    const { locations, category, portraits: houseguests, text } = event;
    const location = locations ? locations[randomArrayIndex(locations)] : "";
    return (
        <HouseEventBox
            imageURL={getEventBackgroundImage(location)}
            location={location}
            category={category}
            houseguests={houseguests}
            text={text}
        />
    );
}

export class Scene {
    readonly title: string = "";
    readonly gameState: GameState = new GameState({ players: [], jury: -1, finalists: -1 });
    readonly content: JSX.Element = (<div>{`Error while rendering ${this.title}`}</div>);
    public render: JSX.Element;
    public constructor(init: Partial<InitScene>) {
        Object.assign(this, init);
        this.render = (
            <div>
                <ViewsBar gameState={this.gameState} />
                <CenteredBold style={{fontSize: "20px"}}>{this.title}</CenteredBold>
                {this.content}
                <BottomBar gameState={this.gameState} />
            </div>
        );
    }
}
