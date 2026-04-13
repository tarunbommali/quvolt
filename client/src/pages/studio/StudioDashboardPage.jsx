import useStudioDashboardController from '../../hooks/useStudioDashboardController';
import StudioDashboardView from '../../components/organizerDashboard/StudioDashboardView';

const StudioDashboardPage = () => {
    const dashboard = useStudioDashboardController();

    return <StudioDashboardView dashboard={dashboard} />;
};

export default StudioDashboardPage;

