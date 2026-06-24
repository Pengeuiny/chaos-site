import type { Production } from "@/lib/types";
import styles from "./admin.module.css";

/**
 * The full set of show fields, shared by the create and edit forms.
 * Pass `defaults` to pre-fill every field (edit); omit it for a blank
 * create form. The parent supplies the <form>, submit button, and any
 * hidden inputs (e.g. the row id for edits).
 */
export default function ShowFormFields({
  defaults,
}: {
  defaults?: Production;
}) {
  const d = defaults;
  return (
    <>
      <label className={styles.label}>
        Title *
        <input
          className={styles.input}
          name="title"
          required
          defaultValue={d?.title ?? ""}
        />
      </label>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Program *</legend>
        <label className={styles.radio}>
          <input
            type="radio"
            name="program"
            value="theatre"
            defaultChecked={(d?.program ?? "theatre") === "theatre"}
          />
          Theatre
        </label>
        <label className={styles.radio}>
          <input
            type="radio"
            name="program"
            value="choir"
            defaultChecked={d?.program === "choir"}
          />
          Choir / Chorus
        </label>
      </fieldset>

      <div className={styles.row2}>
        <label className={styles.label}>
          Slug <span className={styles.hint}>(optional)</span>
          <input
            className={styles.input}
            name="slug"
            placeholder="auto from title"
            defaultValue={d?.slug ?? ""}
          />
        </label>
        <label className={styles.label}>
          Type
          <input
            className={styles.input}
            name="type"
            placeholder="Mainstage Musical"
            defaultValue={d?.type ?? ""}
          />
        </label>
      </div>

      <div className={styles.row2}>
        <label className={styles.label}>
          Tag text
          <input
            className={styles.input}
            name="tag_text"
            placeholder="On Sale"
            defaultValue={d?.tag_text ?? ""}
          />
        </label>
        <label className={styles.label}>
          Tag style
          <select
            className={styles.input}
            name="tag_class"
            defaultValue={d?.tag_class ?? "onsale"}
          >
            <option value="onsale">On Sale (gold)</option>
            <option value="upcoming">Upcoming (pink)</option>
            <option value="camp">Camp (teal)</option>
            <option value="past">Past (grey)</option>
          </select>
        </label>
      </div>

      <div className={styles.row2}>
        <label className={styles.label}>
          Accent color
          <input
            className={styles.input}
            type="color"
            name="accent"
            defaultValue={d?.accent ?? "#b11e37"}
          />
        </label>
        <label className={styles.label}>
          Sort order
          <input
            className={styles.input}
            type="number"
            name="sort_order"
            defaultValue={d?.sort_order ?? 0}
          />
        </label>
      </div>

      <label className={styles.label}>
        Venue
        <input
          className={styles.input}
          name="venue"
          placeholder="Cuthbertson High School Auditorium"
          defaultValue={d?.venue ?? ""}
        />
      </label>
      <label className={styles.label}>
        Address
        <input
          className={styles.input}
          name="address"
          placeholder="1520 Cuthbertson Rd, Waxhaw, NC 28173"
          defaultValue={d?.address ?? ""}
        />
      </label>
      <label className={styles.label}>
        Date range <span className={styles.hint}>(display label)</span>
        <input
          className={styles.input}
          name="date_range"
          placeholder="April 16–18, 2026"
          defaultValue={d?.date_range ?? ""}
        />
      </label>
      <label className={styles.label}>
        Tagline
        <input
          className={styles.input}
          name="tagline"
          defaultValue={d?.tagline ?? ""}
        />
      </label>
      <label className={styles.label}>
        Synopsis
        <textarea
          className={styles.textarea}
          name="synopsis"
          rows={4}
          defaultValue={d?.synopsis ?? ""}
        />
      </label>

      <div className={styles.row2}>
        <label className={styles.label}>
          Ticket URL
          <input
            className={styles.input}
            name="ticket_url"
            placeholder="https://…"
            defaultValue={d?.ticket_url ?? ""}
          />
        </label>
        <label className={styles.label}>
          Poster URL
          <input
            className={styles.input}
            name="poster_url"
            placeholder="https://…"
            defaultValue={d?.poster_url ?? ""}
          />
        </label>
      </div>

      <label className={styles.check}>
        <input
          type="checkbox"
          name="has_microsite"
          defaultChecked={d?.has_microsite ?? false}
        />{" "}
        Has a microsite
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="cast_is_sample"
          defaultChecked={d?.cast_is_sample ?? false}
        />{" "}
        Cast list is a sample
      </label>
    </>
  );
}
