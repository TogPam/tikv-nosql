package com.shoes.infrastructure.tikv;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.tikv.common.BytePairWrapper;
import org.tikv.common.ByteWrapper;
import org.tikv.common.Snapshot;
import org.tikv.common.TiSession;
import org.tikv.common.util.ConcreteBackOffer;
import org.tikv.kvproto.Kvrpcpb;
import org.tikv.shade.com.google.protobuf.ByteString;
import org.tikv.txn.TwoPhaseCommitter;
import org.springframework.stereotype.Repository;

@Repository
public class TiKVStorageAdapter implements KvReader, KvPrefixScanner, KvAtomicWriter {
    private final TiSession session;

    public TiKVStorageAdapter(TiSession session) {
        this.session = session;
    }

    @Override
    public Optional<byte[]> get(String key) {
        Snapshot snapshot = session.createSnapshot();
        byte[] value = snapshot.get(key.getBytes(StandardCharsets.UTF_8));
        return value == null || value.length == 0 ? Optional.empty() : Optional.of(value);
    }

    @Override
    public List<KvEntry> scanPrefix(String prefix) {
        Snapshot snapshot = session.createSnapshot();
        Iterator<Kvrpcpb.KvPair> rows = snapshot.scanPrefix(ByteString.copyFrom(prefix, StandardCharsets.UTF_8));
        List<KvEntry> entries = new ArrayList<>();
        while (rows.hasNext()) {
            Kvrpcpb.KvPair row = rows.next();
            entries.add(new KvEntry(row.getKey().toStringUtf8(), row.getValue().toByteArray()));
        }
        return entries;
    }

    public static List<String> prepareSecondaryKeys(String primaryKey, Map<String, byte[]> mutations) {
        return mutations.keySet().stream()
            .filter(key -> !key.equals(primaryKey))
            .sorted(Comparator.naturalOrder())
            .toList();
    }

    public static long nextCommitTs(long startTs, long observedTs) {
        return Math.max(startTs + 1, observedTs);
    }

    @Override
    public void writeAtomically(Map<String, byte[]> mutations) {
        if (mutations.isEmpty()) return;
        Map<String, byte[]> ordered = new LinkedHashMap<>(mutations);
        String primary = ordered.keySet().iterator().next();
        byte[] primaryKey = primary.getBytes(StandardCharsets.UTF_8);
        long startTs = session.getTimestamp().getVersion();
        try (TwoPhaseCommitter committer = new TwoPhaseCommitter(session, startTs)) {
            committer.prewritePrimaryKey(ConcreteBackOffer.newCustomBackOff(10000), primaryKey, ordered.get(primary));
            List<BytePairWrapper> secondaryPairs = new ArrayList<>();
            for (String key : prepareSecondaryKeys(primary, ordered)) {
                secondaryPairs.add(new BytePairWrapper(key.getBytes(StandardCharsets.UTF_8), ordered.get(key)));
            }
            if (!secondaryPairs.isEmpty()) {
                committer.prewriteSecondaryKeys(primaryKey, secondaryPairs.iterator(), 10000);
            }
            long commitTs = nextCommitTs(startTs, session.getTimestamp().getVersion());
            committer.commitPrimaryKey(ConcreteBackOffer.newCustomBackOff(10000), primaryKey, commitTs);
            if (!secondaryPairs.isEmpty()) {
                List<ByteWrapper> secondaryKeys = secondaryPairs.stream()
                    .map(pair -> new ByteWrapper(pair.getKey())).toList();
                committer.commitSecondaryKeys(secondaryKeys.iterator(), commitTs, 10000);
            }
        } catch (Exception exception) {
            throw new ConcurrencyConflictException("TiKV transaction failed", exception);
        }
    }
}
