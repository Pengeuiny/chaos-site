import s from "./play.module.css";

export default function DaedaCredit() {
  return (
    <p className={s.credit}>
      Built by{" "}
      <a href="https://daeda.net" target="_blank" rel="noopener">
        Daeda Group
      </a>
    </p>
  );
}
