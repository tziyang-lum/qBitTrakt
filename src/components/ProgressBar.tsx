import { View } from "react-native";
import { Theme, paletteDark } from "../theme/palettes";
import { makeStyles } from "../theme/styles";

export function ProgressBar({ value, t }: { value: number; t: Theme }) {
  const styles = makeStyles(t);
  return (
    <View style={t === paletteDark ? styles.progressOuterDark : styles.progressOuter}>
      <View
        style={[
          styles.progressInner,
          {
            width: `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`,
            backgroundColor: t.blue,
          },
        ]}
      />
    </View>
  );
}
