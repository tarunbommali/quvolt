import { X } from 'lucide-react';
import Modal from '../../../components/common/ui/Modal';
import { modalStyles } from '../../../styles/layoutStyles';
import { textStyles } from '../../../styles/commonStyles';
import { cardStyles } from '../../../styles/cardStyles';

const HistoryLeaderboardModal = ({ open, leaderboard, meta, onClose }) => (
    <Modal open={open}>
        <div className={modalStyles.overlayCenterPad}>
            <div className={`${modalStyles.panelWide} flex flex-col`}>
                <div className={modalStyles.headerRowSoft}>
                    <div>
                        <h2 className={modalStyles.headingHero}>{meta.title}</h2>
                        <p className={`${textStyles.overline} mt-1`}>{meta.sub}</p>
                    </div>
                    <button onClick={onClose} className={modalStyles.closeButtonSoft}>
                        <X />
                    </button>
                </div>
                <div className={modalStyles.contentScroll}>
                    {leaderboard.map((player, i) => (
                        <div key={player.name || i} className={`${cardStyles.base} ${cardStyles.hover} ${cardStyles.leaderboardEntry}`}>
                            <div className={cardStyles.leaderboardIdentity}>
                                <span className={`${cardStyles.leaderboardRank} ${i === 0 ? 'theme-tone-caution' : i === 1 ? 'text-slate-400 dark:text-gray-300' : i === 2 ? 'theme-tone-warning' : 'text-slate-300 dark:text-gray-500'}`}>
                                    #{i + 1}
                                </span>
                                <div>
                                    <p className={cardStyles.leaderboardPlayer}>{player.name}</p>
                                </div>
                            </div>
                            <div className={textStyles.rightAlign}>
                                <p className={cardStyles.leaderboardScore}>{player.score}</p>
                                <p className={textStyles.overline}>
                                    {player.time ? `${player.time.toFixed(1)}s avg` : 'Points'}
                                </p>
                            </div>
                        </div>
                    ))}
                    {leaderboard.length === 0 && (
                        <p className={textStyles.emptyHint}>
                            No mastery data recorded yet...
                        </p>
                    )}
                </div>
                <div className={cardStyles.leaderboardFooter}>
                    Top {leaderboard.length} Performers
                </div>
            </div>
        </div>
    </Modal>
);

export default HistoryLeaderboardModal;

