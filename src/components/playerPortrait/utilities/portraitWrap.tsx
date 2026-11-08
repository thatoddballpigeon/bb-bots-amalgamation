import "../charCard.scss";
import React from "react";
import { CharacterCardProps } from "../characterCard";

export const CCPortraitWrap = React.memo(function CCPortraitWrap({
    player,
    index,
    handlers
}: CharacterCardProps): JSX.Element {
    return (
        <div className="cc-portrait-wrap">
            <div className="cc-portrait">
                <img className="cc-portrait-img" src={player.imageURL} alt="" />
            </div>
            <div className="cc-portrait-buttons">
                <button
                    className="cc-button"
                    data-index={index - 1}
                    data-id={player.castingScreenId}
                    style={{marginTop: "3px"}}
                    onClick={handlers.onImageURL}
                >
                    Image URL
                </button>
            </div>
        </div>
    );
});