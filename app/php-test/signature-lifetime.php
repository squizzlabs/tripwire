<?php
// Run: php app/php-test/signature-lifetime.php
error_reporting(E_ALL & ~E_DEPRECATED);
date_default_timezone_set('UTC');
$_SESSION = ['characterID' => 1, 'characterName' => 'Test', 'mask' => 1, 'userID' => 1];
require __DIR__.'/../../signatures.php';
function check($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}
$start = date('Y-m-d H:i:s', time() - 3600);
foreach (['unknown' => 86400, 'data' => 259200, 'relic' => 259200, 'combat' => 259200,
          'gas' => 259200, 'ore' => 259200, 'other' => 259200, 'wormhole' => 172800] as $type => $cap) {
    foreach ([0, -1, 672 * 3600] as $length) {
        $s = new signature(['type' => $type, 'lifeTime' => $start, 'lifeLength' => $length,
                            'lifeLeft' => '2099-01-01 00:00:00']);
        $s->enforceLifetime();
        check($s->lifeLength === $cap, "$type duration cap");
        check(strtotime($s->lifeLeft) === strtotime($start) + $cap, "$type deadline cap");
    }
}
foreach (['A009' => 4.5, 'C008' => 4.5, 'U210' => 23.5, 'B520' => 24, 'C391' => 24,
          'B041' => 48, 'C729' => 12, 'F216' => 12, 'I078' => 12, 'K162' => 48, '????' => 48] as $type => $hours) {
    $cap = signatureMaximumLifetime('wormhole', strtolower($type));
    check($cap === (int)($hours * 3600), "$type lookup");
    $s = new signature(['type' => 'wormhole', 'lifeTime' => $start, 'lifeLength' => 672 * 3600]);
    $s->enforceLifetime($cap);
    check(strtotime($s->lifeLeft) === strtotime($start) + $cap, "$type deadline");
}
$s = new signature(['type' => 'wormhole', 'lifeTime' => $start, 'lifeLength' => 86400,
                    'lifeLeft' => date('Y-m-d H:i:s', time() + 600)]);
$deadline = $s->lifeLeft;
$s->lifeLength = 172800;
$s->enforceLifetime(86400);
check($s->lifeLeft === $deadline, 'Duration edits must preserve an earlier EOL deadline');
$s->lifeTime = date('Y-m-d H:i:s', time() + 86400);
check($s->lifeTime === $start, 'Editing must not renew the age');
$s = new signature(['type' => 'unknown', 'lifeTime' => '2099-01-01 00:00:00']);
$s->enforceLifetime();
check(strtotime($s->lifeLeft) <= time() + 86400, 'Future starts must not evade caps');
$s = new signature(['type' => 'unknown', 'lifeTime' => '2020-01-01 00:00:00', 'lifeLength' => 0]);
$s->enforceLifetime();
check($s->lifeLeft === '2020-01-02 00:00:00', 'Legacy immortal signatures retain their original age');

// Exercise paired persistence without requiring a production database.
class TestStatement {
    public $values = [];
    function bindValue($key, $value) { $this->values[$key] = $value; }
    function execute() { return true; }
}
class TestDatabase {
    public $writes = [];
    function prepare($query) { $s = new TestStatement(); $this->writes[] = $s; return $s; }
}
$db = new TestDatabase();
$a = new signature(['id' => 1, 'type' => 'wormhole', 'lifeTime' => $start, 'lifeLength' => 259200]);
$b = new signature(['id' => 2, 'type' => 'wormhole', 'lifeLength' => 259200]);
$hole = new wormhole(['type' => 'A009', 'life' => 'stable']);
enforceWormholeLifetime($hole, $a, $b, $db);
check($a->lifeLeft === $b->lifeLeft && $a->lifeTime === $b->lifeTime, 'Both ends share the earliest age/deadline');
check(strtotime($a->lifeLeft) === strtotime($start) + 16200, 'Pair uses its type cap');
check(count($db->writes) === 2, 'Both ends persisted');
$hole->life = 'critical';
$a->lifeLeft = date('Y-m-d H:i:s', time() + 60);
enforceWormholeLifetime($hole, $a, $b, $db);
check($a->lifeLeft === $b->lifeLeft && strtotime($b->lifeLeft) <= time() + 60, 'EOL never extends an earlier deadline');
$a = new signature(['type' => 'wormhole', 'lifeTime' => $start]);
$b = new signature(['type' => 'wormhole', 'lifeTime' => $start]);
enforceWormholeLifetime($hole, $a, $b, $db, 1);
check(strtotime($a->lifeLeft) <= time() + 3600, 'One-hour EOL applies to new/converting connections too');
foreach ([[6, 3, 16], [8, 2, 48], [9, 3, 4.5], [10, 10, 12], [6, null, 24], [null, null, 48]] as $example) {
    list($source, $target, $hours) = $example;
    check(signatureMaximumLifetime('wormhole', 'K162', $source, $target) === (int)($hours * 3600), 'Unknown type uses eligible maximum');
    check(signatureMaximumLifetime('wormhole', null, $target, $source) === (int)($hours * 3600), 'Unknown type checks both directions');
}
$a = new signature(['type' => 'wormhole', 'systemID' => 9, 'lifeTime' => $start]);
$b = new signature(['type' => 'wormhole', 'systemID' => 3, 'lifeTime' => $start]);
enforceWormholeLifetime(new wormhole(), $a, $b, $db);
check($a->lifeLength === 16200 && $b->lifeLength === 16200, 'Unknown C13 connection capped on both ends');
echo "Signature lifetime checks passed\n";
