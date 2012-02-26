package voxxr.data;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * User: xavierhanin
 * Date: 2/26/12
 * Time: 9:01 AM
 */
public class EV {
    public static enum Type {
        RATE("R") {
            private final Pattern REGEX = Pattern.compile("^R\\d+$");
            @Override
            public boolean accept(String valueWithType) {
                return REGEX.matcher(valueWithType).matches();
            }
        },
        FEELING("F"), CONNECTION("C"), TITLE("T"),
        POLL_START("PS"), POLL_END("PE"), POLL_VOTE("PV"), UNKNOWN("");

        public static Type getByCode(String code) {
            for (Type type : values()) {
                if (type.getCode().equals(code)) {
                    return type;
                }
            }
            return null;
        }

        private String code;

        Type(String code) {
            this.code = code;
        }

        public String getCode() {
            return code;
        }

        public boolean accept(String valueWithType) {
            return valueWithType.startsWith(code);
        }

        public String getValueIn(String valueWithType) {
            return valueWithType.substring(code.length());
        }
    }

    public static EV parse(String pres, String evBC) {
        String[] parts = evBC.split("\\|");
        for (EV.Type type : EV.Type.values()) {
            if (type.accept(parts[1])) {
                return new EV(pres, parts[0], type, type.getValueIn(parts[1]));
            }
        }
        throw new IllegalArgumentException("invalid EV: " + evBC + ": no matched EV.Type");
    }

    private final UUID key;
    private final String pres;
    private final String user;
    private final Type type;
    private final String value;
    private final long timestamp;

    public EV(String pres, String user, Type type, String value) {
        this(UUID.randomUUID(), pres, user, type, value, System.currentTimeMillis());
    }

    public EV(UUID key, String pres, String user, Type type, String value, long timestamp) {
        this.key = key;
        this.pres = pres;
        this.user = user;
        this.type = type;
        this.value = value;
        this.timestamp = timestamp;
    }

    public UUID getKey() {
        return key;
    }

    public String getPres() {
        return pres;
    }

    public String getUser() {
        return user;
    }

    public Type getType() {
        return type;
    }

    public String getValue() {
        return value;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public String toBC() {
        return user + '|' + type.getCode() + value;
    }

    @Override
    public String toString() {
        return "EV{" +
                "room='" + pres + '\'' +
                ", user='" + user + '\'' +
                ", type=" + type +
                ", value='" + value + '\'' +
                '}';
    }
}
