#!/bin/bash
set -e

mkdir -p /data/pd /data/tikv1 /data/tikv2 /data/tikv3

echo "=========================================================="
echo " Starting All-In-One TiKV Cluster + Frontend"
echo "=========================================================="

echo "[1/4] Starting Placement Driver (PD)..."
/pd-server \
  --name=pd \
  --client-urls=http://0.0.0.0:2379 \
  --peer-urls=http://0.0.0.0:2380 \
  --advertise-client-urls=http://127.0.0.1:2379 \
  --advertise-peer-urls=http://127.0.0.1:2380 \
  --initial-cluster=pd=http://127.0.0.1:2380 \
  --data-dir=/data/pd &

sleep 3

echo "[2/4] Starting 3 TiKV Storage Nodes..."
/tikv-server \
  --pd-endpoints=http://127.0.0.1:2379 \
  --addr=0.0.0.0:20161 \
  --advertise-addr=127.0.0.1:20161 \
  --status-addr=0.0.0.0:20181 \
  --advertise-status-addr=127.0.0.1:20181 \
  --data-dir=/data/tikv1 &

/tikv-server \
  --pd-endpoints=http://127.0.0.1:2379 \
  --addr=0.0.0.0:20162 \
  --advertise-addr=127.0.0.1:20162 \
  --status-addr=0.0.0.0:20182 \
  --advertise-status-addr=127.0.0.1:20182 \
  --data-dir=/data/tikv2 &

/tikv-server \
  --pd-endpoints=http://127.0.0.1:2379 \
  --addr=0.0.0.0:20163 \
  --advertise-addr=127.0.0.1:20163 \
  --status-addr=0.0.0.0:20183 \
  --advertise-status-addr=127.0.0.1:20183 \
  --data-dir=/data/tikv3 &

sleep 2

echo "[3/4] Starting TiDB Server (MySQL on 4000)..."
/tidb-server \
  --store=tikv \
  --path=127.0.0.1:2379 \
  --status=10080 &

echo "[4/4] Starting Frontend Web Store on 5173..."
python3 /spa_server.py &

echo "=========================================================="
echo " ALL SERVICES RUNNING IN SINGLE CONTAINER!"
echo " Storefront:       http://localhost:5173"
echo " TiKV Dashboard:   http://localhost:2379/dashboard"
echo " TiDB MySQL:       127.0.0.1:4000"
echo " TiKV Nodes:       127.0.0.1:20161, 20162, 20163"
echo "=========================================================="

wait -n
