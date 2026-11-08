import React from "react";
import { GameState, getHouseguestById, hgPreferredName, Houseguest } from "../../../model";
import { AllianceEvent, checkGroupAllianceFormation, checkShowmanceFormation } from "../../../utils/alliances";
import { listNames } from "../../../utils/listStrings";
import { CenteredBold } from "../../layout/centered";
import { HorizontalLine } from "../../layout/line";

interface AllianceEventsOptions {
    dim?: boolean;
    initiator?: boolean;
    campaigner?: boolean;
    pusher?: boolean;
}

export let allianceEvents: AllianceEvent[] = [];

export function generateAllianceEvents(splitIndex: number | null | undefined, gameState: GameState) {
    checkGroupAllianceFormation(splitIndex, gameState);
    checkShowmanceFormation(splitIndex, gameState);
    if (!allianceEvents?.length) return '';

    const avHtml = (c: Houseguest, opts: AllianceEventsOptions) => {
        const opacity = opts.dim ? 0.35 : 1;
        const border = opts.initiator ? '2px solid #a78bfa' : opts.campaigner ? '2px solid #4ade80' : opts.dim ? '2px solid rgba(255,61,107,0.15)' : '2px solid rgba(255,61,107,0.4)';
        return <div 
                style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c2185b, #120d22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#ff80ab',
                    overflow: 'hidden',
                    flexShrink: 0,
                }} 
                title={
                    opts.pusher 
                        ? `${c.preferredName()} (pushing)` 
                        : opts.dim 
                        ? `${c.preferredName()} (on the fence)` 
                        : c.preferredName()
                    }
                >
                <img 
                    src={c.imageURL} 
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }} 
                    alt={c.preferredName ? c.preferredName() : ''}
                />
            </div>
    };
    const rows = allianceEvents.map(evt => {
        const al = evt.alliance;
        let label: string = '', detail: string = '', avatarsHtml: JSX.Element = <></>;
        if (evt.type === 'formed') {
            const members = (gameState.houseguests || []).filter(c => al.members.includes(c.id));
            let initiator = al.initiator ? gameState.houseguests.find(c => c.id === al.initiator) : null;
            const sorted = initiator ? [initiator, ...members.filter(c => c.id !== initiator?.id)] : members;
            const declined = (evt.declined || []).map(hg => gameState.houseguests.find(c => c.id === hg.id)).filter(Boolean);
            const declinedAvatars = declined.filter((c): c is Houseguest => !!c).map(c => avHtml(c, { dim: true }));
            const sep = declined.length ? (
                <div 
                    style={{
                    width: '1px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    margin: '0 4px',
                    alignSelf: 'stretch'
                    }} 
                />
                ) : null;

            avatarsHtml = <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                {sorted.map((c, i) => avHtml(c, i === 0 && initiator ? { initiator: true } : {}))}
                {sep}
                {declinedAvatars}
            </div>;
            if (al.isShowmance) {
                const memberSet = new Set((al.members).map(Number));
                const isReform = (gameState.alliances || []).some(other =>
                    other.id !== al.id && other.isShowmance && !other.isActive
                    && other.dissolutionReason && other.dissolutionReason !== 'both_evicted'
                    && other.members?.length === memberSet.size
                    && other.members.every(id => memberSet.has(Number(id)))
                );
                label = 'Showmance Formed';
                detail = isReform
                    ? `${al.name}. Yippee.`
                    : `${al.name}. Something's clearly happening there.`;
            } else {
                label = 'Alliance Formed';
                const declinedNote = declined.length ? ` ${declined.map(c => c?.preferredName()).join(', ')} declined.` : '';
                detail = (initiator
                    ? `${al.name}. ${initiator.preferredName()} pulled this group together.`
                    : al.name) + declinedNote;
            }
        } else if (evt.type === 'invite_failed') {
            const initiator = al.initiator ? gameState.houseguests.find(c => c.id === al.initiator) : null;
            const declined = (evt.declined || []).map(hg => gameState.houseguests.find(c => c.id === hg.id)).filter(Boolean);
            avatarsHtml = <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {declined
                    .filter((c): c is Houseguest => !!c)
                    .map((c) => avHtml(c, { dim: true }))}
                </div>
            ;
            if (al.isShowmance) {
                label = 'Showmance Didn\'t Happen';
                detail = declined.length
                    ? `${listNames(declined.filter((c): c is Houseguest => !!c).map(c => c.preferredName())) ?? ''} wasn't feeling it. Nothing came of it.`
                    : `It didn't come together.`;
            } else {
                label = 'Alliance Failed';
                detail = declined
                    ? `${listNames(declined.filter((c): c is Houseguest => !!c).map(c => c.preferredName()))} turned down ${`${initiator?.preferredName()}'s` || 'the'} offer. The alliance never formed.`
                    : `Not enough members accepted. The alliance never formed.`;
            }
        } else if (evt.type === 'member_recruited') {
            const joined  = (evt.joined || []).map(hg => gameState.houseguests.find(c => c.id === hg.id)).filter(Boolean);
            const declined = (evt.declined || []).map(hg => gameState.houseguests.find(c => c.id === hg.id)).filter(Boolean);
            const declinedAvatars = declined.filter((c): c is Houseguest => !!c).map(c => avHtml(c, { dim: true }));
            const sep = declined.length ? `<div style="width:1px;background:rgba(255,255,255,0.1);margin:0 4px;align-self:stretch;"></div>` : '';
            avatarsHtml = <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                {joined
                    .filter((c): c is Houseguest => !!c)
                    .map((c) => avHtml(c, {}))}
                {sep}
                {declinedAvatars}
            </div>;
            if (joined.length && declined.length) {
                label = 'Recruited';
                detail = `${joined.map(c => c?.preferredName()).join(', ')} joined ${al.name}. ${declined.map(c => c?.preferredName()).join(', ')} declined.`;
            } else if (joined.length && evt.defected) {
                // Same event shape, different story: this player was just thrown out of their own
                // alliance and got taken in here rather than ending up aligned with nobody.
                const _who = joined.map(c => c?.preferredName()).join(', ');
                const _spn = (gameState.houseguests.find(c => c.id === evt.initiator?.id)?.preferredName() || '');
                label = 'Defected';
                detail = _spn
                    ? `${_who} burned their own alliance and ${_spn} took them into ${al.name}.`
                    : `${_who} burned their own alliance and landed in ${al.name}.`;
            } else if (joined.length) {
                label = 'Recruited';
                detail = `${joined.map(c => c?.preferredName()).join(', ')} joined ${al.name}.`;
            } else {
                label = 'Invite Declined';
                detail = `${declined.map(c => c?.preferredName()).join(', ')} turned down the invite to ${al.name}.`;
            }
        } else if (evt.type === 'member_removed') {
            const removed = gameState.houseguests.find(c => c.id === evt.removed);
            const members = (gameState.houseguests || []).filter(c => al.members.includes(c.id));
            avatarsHtml = <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {members.map((c: Houseguest) => avHtml(c, {}))}
            </div>;
            label = 'Betrayal';
            detail = `${removed?.preferredName() || 'A member'} was removed from ${al.name} after nominating an ally.`;
        } else if (evt.type === 'dissolved') {
            const members = (gameState.houseguests || []).filter(c => al.members.includes(c.id));
            avatarsHtml = <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {members.map((c: Houseguest) => avHtml(c, { dim: true }))}
            </div>;
            if (al.isShowmance && al.dissolutionReason === 'both_evicted') {
                label = 'Showmance Over';
                detail = `${al.name} both left the villa. Their showmance is now part of the season's history.`;
            } else if (al.isShowmance) {
                label = 'Showmance Over';
                detail = `${al.name} called it. Whatever spark was there couldn't hold.`;
            } else {
                label = 'Alliance Dissolved';
                detail = `${al.name} fell apart. Bonds had weakened too far to hold.`;
            }
        } else if (evt.type === 'coord') {
            const committedIds = new Set(evt.committed || []);
            const pusherId = evt.campaigner?.id;
            const allMembers = [...(evt.committed || []), ...(evt.fenced || [])];

            const committedAvatars = (evt.committed || []).map(c => avHtml(c, { campaigner: c.id === pusherId }));
            const fenceAvatars = (evt.fenced || []).map(c => avHtml(c, { dim: true }));

            const nomAvatars = (evt.nominated || []).map((c, idx) => {
                const s = {
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c2185b, #120d22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#ff80ab',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '2px solid rgba(251, 191, 36, 0.6)',
                    opacity: 0.5,
                };

                const img = c.imageURL ? (
                    <img 
                    src={c.imageURL} 
                    alt={c.preferredName()}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                ) : (
                    (c?.preferredName() || '?')[0]
                );

                return (
                    <div key={`nom-${idx}`} style={s} title={`${c.preferredName()} (nominated)`}>
                    {img}
                    </div>
                );
            });

            const separatorStyle = {
                width: '1px',
                background: 'rgba(255, 255, 255, 0.12)',
                margin: '0 4px',
                alignSelf: 'stretch',
            };

            const sep1 = fenceAvatars.length > 0 ? <div style={separatorStyle} /> : null;
            const sep2 = nomAvatars.length > 0 ? <div style={separatorStyle} /> : null;

            avatarsHtml = (
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    {committedAvatars}
                    {sep1}
                    {fenceAvatars}
                    {sep2}
                    {nomAvatars}
                </div>
            );

            label = 'Alliance Target';
            detail = evt.detail || `${al.name} has a target this week.`;
        }
        const isFormed = evt.type === 'formed';
        // Showmances are the same feed/array as alliances, just recolored cyan with a heart
        // marker so they read as a distinct romantic category, not a strategic one.
        const isShowmance = !!al?.isShowmance;
        const accent = isShowmance ? "" : '#ff3d6b';
        const nameColor = isShowmance ? 'rgba(34,211,238,0.7)' : 'rgba(255,128,171,0.6)';
        const rowBg = isShowmance ? 'rgba(34,211,238,0.06)' : 'rgba(255,61,107,0.05)';
        const rowBorder = isShowmance ? 'rgba(34,211,238,0.2)' : 'rgba(255,61,107,0.15)';
        const labelText = label;
        const strengthBadge = isFormed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '3px', padding: '2px 8px', fontFamily: "'Inter', sans-serif" }}>
                    Active
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', fontFamily: "'Inter', sans-serif" }}>
                    Strength {al.strength}/10
                </div>
            </div>
        ) : null;

        return (
            <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: nameColor, fontFamily: "'Inter', sans-serif", marginBottom: '4px', paddingLeft: '2px' }}>
                    {al.name}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 12px', padding: '12px 14px', background: rowBg, border: `1px solid ${rowBorder}`, borderRadius: '10px' }}>
                    {avatarsHtml}
                    <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent, fontFamily: "'Inter', sans-serif", marginBottom: '3px' }}>
                            {labelText}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#d1d5db', fontFamily: "'Inter', sans-serif" }}>
                            {detail}
                        </div>
                    </div>
                    {strengthBadge && (
                        <div style={{ flexShrink: 0 }}>
                            {strengthBadge}
                        </div>
                    )}
                </div>
            </div>
        );
    });

    allianceEvents = [];
    return <div style={{ marginTop: "32px" }}>
        <HorizontalLine />
        <CenteredBold style={{fontSize: "20px"}}>ALLIANCES</CenteredBold>
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>{rows}</div>
    </div>;
}