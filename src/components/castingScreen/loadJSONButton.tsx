import React from "react";
import { Input } from "../layout/text";
    
export function LoadJSONButton(props: any): JSX.Element {
    return (
        <div
            className="button"
        >
            <label
                htmlFor="file-load"
                className="load-button"
                style={{ cursor: "pointer", display: "inline-block", width: "100%" }}
            >
                Load cast
            </label>
            <Input
                id="file-load"
                style={{
                    display: "none",
                    cursor: "pointer"
                }}
                type="file"
                accept="application/json"
                multiple
                onChange={props.onChange} />
        </div>
    );
}
