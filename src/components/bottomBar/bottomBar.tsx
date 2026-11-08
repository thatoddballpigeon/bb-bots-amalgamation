import React from "react";
import { popularityMode, powerMode } from "../../model/portraitDisplayMode";
import { GameState, inJury } from "../../model";
import { displayMode$ } from "../../subjects/subjects";
import { BottomBarTag } from "./bottomBarTag";

export class BottomBar extends React.Component<{ gameState: GameState }, {}> {
    public constructor(props: { gameState: GameState }) {
        super(props);
        if (!inJury(this.props.gameState) && displayMode$.value === powerMode) {
            displayMode$.next(popularityMode);
        }
    }

    componentDidUpdate() {
        if (!inJury(this.props.gameState) && displayMode$.value === powerMode) {
            displayMode$.next(popularityMode);
        }
    }

    render() {
        return (
            <div style={{ marginBottom: 0 }}>
                <div key="bottombar">
                    <BottomBarTag gameState={this.props.gameState} text={"TV Ratings"}></BottomBarTag>
                </div>
            </div>
        );
    }
}
