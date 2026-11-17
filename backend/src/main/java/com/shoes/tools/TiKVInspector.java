package com.shoes.tools;

import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import org.tikv.common.Snapshot;
import org.tikv.common.TiConfiguration;
import org.tikv.common.TiSession;
import org.tikv.kvproto.Kvrpcpb;
import org.tikv.shade.com.google.protobuf.ByteString;

public final class TiKVInspector {
    private TiKVInspector() {}

    public static void main(String[] args) throws Exception {
        String pdEndpoints = args.length > 0 ? args[0] : "127.0.0.1:2379";
        String prefix = args.length > 1 ? args[1] : "product:";
        TiSession session = TiSession.create(TiConfiguration.createDefault(pdEndpoints));

        try {
            Snapshot snapshot = session.createSnapshot();
            Iterator<Kvrpcpb.KvPair> rows = snapshot.scanPrefix(
                ByteString.copyFrom(prefix, StandardCharsets.UTF_8));
            int count = 0;
            while (rows.hasNext()) {
                Kvrpcpb.KvPair row = rows.next();
                System.out.printf("%s\t%s%n", row.getKey().toStringUtf8(), row.getValue().toStringUtf8());
                count++;
            }
            System.out.printf("%n%d key(s) matched prefix '%s'.%n", count, prefix);
        } finally {
            session.close();
        }
    }
}