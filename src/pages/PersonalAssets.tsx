import { useState, useMemo } from 'react';
import { PlusCircle, CreditCard, DollarSign } from 'lucide-react';
import { useInvoiceStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';

function PersonalAssets() {
  const {
    assets,
    addAsset,
    updateAsset,
    removeAsset,
    createAssetRemote,
    updateAssetRemote,
    removeAssetRemote,
  } = useInvoiceStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'cash',
    value: '',
    currency: 'TWD',
    acquiredDate: '',
    notes: '',
  });

  const totalValue = useMemo(
    () => assets.reduce((s, a) => s + (a.value || 0), 0),
    [assets]
  );

  const handleAdd = async () => {
    const newAsset = {
      id: `asset-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: form.name || 'Unnamed',
      type: form.type as any,
      value: Number(form.value || 0),
      currency: form.currency || 'TWD',
      acquiredDate: form.acquiredDate ? new Date(form.acquiredDate) : undefined,
      notes: form.notes,
    };
    // Attempt remote create (perform optimistic add + rollback on error) via store
    await createAssetRemote(newAsset);
    setDialogOpen(false);
  };

  const handleEditOpen = (asset: any) => {
    setEditingAsset({
      ...asset,
      value: String(asset.value),
      acquiredDate: asset.acquiredDate
        ? new Date(asset.acquiredDate).toISOString().split('T')[0]
        : '',
    });
    setDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingAsset) return;
    await updateAssetRemote(editingAsset.id, {
      name: editingAsset.name,
      type: editingAsset.type,
      value: Number(editingAsset.value || 0),
      currency: editingAsset.currency,
      acquiredDate: editingAsset.acquiredDate
        ? new Date(editingAsset.acquiredDate)
        : undefined,
      notes: editingAsset.notes,
    });
    setEditingAsset(null);
    setDialogOpen(false);
  };

  const handleEditCancel = () => {
    setEditingAsset(null);
    setDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="border-b pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">個人資產</h1>
          <p className="text-muted-foreground mt-2">
            管理您個人的資產項目與總資產價值。
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">總資產（估算）</div>
            <div className="text-xl font-semibold">
              {totalValue.toLocaleString()}
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingAsset(null);
              setForm({
                name: '',
                type: 'cash',
                value: '',
                currency: 'TWD',
                acquiredDate: '',
                notes: '',
              });
              setDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" /> 新增資產
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  名稱
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  類型
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  價值
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  貨幣
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  取得日期
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  操作
                </th>
              </tr>
            </TableHead>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    目前沒有資產項目，請新增。
                  </TableCell>
                </TableRow>
              ) : (
                assets.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>{asset.value.toLocaleString()}</TableCell>
                    <TableCell>{asset.currency}</TableCell>
                    <TableCell>
                      {asset.acquiredDate
                        ? new Date(asset.acquiredDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleEditOpen(asset)}
                        >
                          編輯
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => removeAssetRemote(asset.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={open => (!open ? handleEditCancel() : null)}
      >
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>新增資產</DialogTitle>
            <DialogDescription>
              新增一個新的個人資產項目，並指定金額與類型。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="asset-name">名稱</Label>
            <Input
              value={editingAsset ? editingAsset.name : form.name}
              id="asset-name"
              onChange={e =>
                editingAsset
                  ? setEditingAsset({ ...editingAsset, name: e.target.value })
                  : setForm({ ...form, name: e.target.value })
              }
            />

            <Label htmlFor="asset-type">類型</Label>
            <Select
              onValueChange={val =>
                editingAsset
                  ? setEditingAsset({ ...editingAsset, type: val })
                  : setForm({ ...form, type: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">現金</SelectItem>
                <SelectItem value="bank">銀行存款</SelectItem>
                <SelectItem value="stock">股票</SelectItem>
                <SelectItem value="crypto">加密貨幣</SelectItem>
                <SelectItem value="real_estate">不動產</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>

            <Label htmlFor="asset-value">價值</Label>
            <Input
              value={editingAsset ? editingAsset.value : form.value}
              onChange={e =>
                editingAsset
                  ? setEditingAsset({ ...editingAsset, value: e.target.value })
                  : setForm({ ...form, value: e.target.value })
              }
              id="asset-value"
              type="number"
            />

            <Label htmlFor="asset-currency">貨幣</Label>
            <Select
              onValueChange={val =>
                editingAsset
                  ? setEditingAsset({ ...editingAsset, currency: val })
                  : setForm({ ...form, currency: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="貨幣" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TWD">TWD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="JPY">JPY</SelectItem>
              </SelectContent>
            </Select>

            <Label htmlFor="asset-acquired-date">取得日期</Label>
            <Input
              value={
                editingAsset ? editingAsset.acquiredDate : form.acquiredDate
              }
              onChange={e =>
                editingAsset
                  ? setEditingAsset({
                      ...editingAsset,
                      acquiredDate: e.target.value,
                    })
                  : setForm({ ...form, acquiredDate: e.target.value })
              }
              id="asset-acquired-date"
              type="date"
            />

            <Label htmlFor="asset-notes">備註</Label>
            <Input
              value={editingAsset ? editingAsset.notes : form.notes}
              onChange={e =>
                editingAsset
                  ? setEditingAsset({ ...editingAsset, notes: e.target.value })
                  : setForm({ ...form, notes: e.target.value })
              }
              id="asset-notes"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                editingAsset ? handleEditCancel() : setDialogOpen(false)
              }
            >
              取消
            </Button>
            <Button
              onClick={() => (editingAsset ? handleEditSave() : handleAdd())}
            >
              {editingAsset ? '儲存變更' : '新增資產'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PersonalAssets;
