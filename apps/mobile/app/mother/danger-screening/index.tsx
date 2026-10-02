import { View } from "react-native";
import { AppHeader, ScreenContainer } from "../../../components/ui";
import { DangerScreeningSurvey } from "../../../components/danger-screening";
import { useAuth } from "../../../lib/auth";

export default function MotherDangerScreeningScreen() {
  const { user } = useAuth();

  const midwifePhone = user?.activeMidwifeAssignment?.midwife.whatsappNumber ?? null;
  const facilityPhone = user?.selectedFacility?.phoneNumber ?? null;

  return (
    <ScreenContainer>
      <AppHeader
        title="Skrining Tanda Bahaya"
        subtitle="Evaluasi mandiri berdasarkan Buku KIA Kemenkes RI"
      />
      <View style={{ marginTop: 12 }}>
        <DangerScreeningSurvey
          fallbackMidwifePhone={midwifePhone}
          fallbackFacilityPhone={facilityPhone}
        />
      </View>
    </ScreenContainer>
  );
}
