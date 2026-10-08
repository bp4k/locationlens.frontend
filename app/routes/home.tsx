import { makeStyles, Text, tokens } from "@fluentui/react-components";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "LocationLens" },
    { name: "description", content: "LocationLens" },
  ];
}

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
  },
});

export default function Home() {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Text size={500}>Welcome to LocationLens.</Text>
    </div>
  );
}
