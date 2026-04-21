import Section from '../../layout/Section';
import Container from '../../layout/Container';

/**
 * Trust point grid for the Home page.
 * @param {{ trustPoints: Array<{ label: string, icon: React.ComponentType }>} } props
 */
const HomeTrustGrid = ({ trustPoints }) => {
    return (
        <Section>
            <Container>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {trustPoints.map((point) => {
                        const Icon = point.icon;

                        return (
                            <div
                                key={point.label}
                                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 transition-all text-center flex flex-col items-center gap-3 group"
                            >
                                <Icon className="text-indigo-400 group-hover:scale-110 transition-transform" size={20} />
                                <p className="text-sm font-semibold theme-text-secondary">
                                    {point.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </Container>
        </Section>
    );
};

export default HomeTrustGrid;
