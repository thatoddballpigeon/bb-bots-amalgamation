import React from "react";
import { popularityMode, powerMode } from "../../model/portraitDisplayMode";
import { ViewBarTag } from "./viewBarTag";
import { GameState, inJury } from "../../model";
import { displayMode$ } from "../../subjects/subjects";

export class ViewsBar extends React.Component<{ gameState: GameState }, {}> {
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
                <div className="level is-mobile" key="viewsbar">
                    {inJury(this.props.gameState) && (
                        <>
                        <ViewBarTag mode={popularityMode} text={"Relationships"}></ViewBarTag>
                        <ViewBarTag mode={powerMode} text={"Endgame Winrate"}></ViewBarTag>
                        </>
                    )}
                </div>
            </div>
        );
    }
}
